import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateSparePartDto,
  UpdateSparePartDto,
  CreateStorageLocationDto,
  AdjustStockDto,
  TransferStockDto,
  ConsumePartDto,
  ListPartsQueryDto,
} from './dto/inventory.dto';
import {
  InventoryTransactionType,
  TicketEventType,
  Prisma,
} from '@kalpak/database';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Ensure Default Storage Location Exists for Tenant
  // ─────────────────────────────────────────────────────────────────────────
  async ensureDefaultLocation(tenantId: string) {
    const existing = await this.prisma.storageLocation.findFirst({
      where: { tenantId, isActive: true },
    });
    if (existing) return existing;

    return this.prisma.storageLocation.create({
      data: {
        tenantId,
        name: 'Central Warehouse',
        code: 'WH-CENTRAL',
        type: 'WAREHOUSE',
        address: 'Main Facility & Central Depot',
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Spare Parts Catalog
  // ─────────────────────────────────────────────────────────────────────────
  async listParts(tenantId: string, query: ListPartsQueryDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SparePartWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { partNumber: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rawParts, total] = await Promise.all([
      this.prisma.sparePart.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { partNumber: 'asc' },
        include: {
          inventory: {
            include: {
              location: true,
            },
          },
        },
      }),
      this.prisma.sparePart.count({ where }),
    ]);

    const parts = rawParts.map((part) => {
      const totalStock = part.inventory.reduce((sum, inv) => sum + inv.quantityOnHand, 0);
      const isLowStock = totalStock <= part.minStockAlert;
      return {
        ...part,
        unitPrice: Number(part.unitPrice),
        costPrice: part.costPrice ? Number(part.costPrice) : null,
        totalStock,
        isLowStock,
      };
    });

    const filteredParts = query.lowStockOnly
      ? parts.filter((p) => p.isLowStock)
      : parts;

    return {
      data: filteredParts,
      meta: {
        total: query.lowStockOnly ? filteredParts.length : total,
        page,
        pageSize,
        totalPages: Math.ceil((query.lowStockOnly ? filteredParts.length : total) / pageSize),
      },
    };
  }

  async getPartById(tenantId: string, id: string) {
    const part = await this.prisma.sparePart.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        inventory: {
          include: {
            location: true,
          },
        },
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            location: true,
            performedByUser: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });

    if (!part) {
      throw new NotFoundException(`Spare part ${id} not found`);
    }

    const totalStock = part.inventory.reduce((sum, inv) => sum + inv.quantityOnHand, 0);

    return {
      ...part,
      unitPrice: Number(part.unitPrice),
      costPrice: part.costPrice ? Number(part.costPrice) : null,
      totalStock,
      isLowStock: totalStock <= part.minStockAlert,
    };
  }

  async createPart(tenantId: string, actorUserId: string, dto: CreateSparePartDto) {
    const existing = await this.prisma.sparePart.findFirst({
      where: {
        tenantId,
        partNumber: { equals: dto.partNumber.trim(), mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Spare part with SKU ${dto.partNumber} already exists`);
    }

    const part = await this.prisma.sparePart.create({
      data: {
        tenantId,
        partNumber: dto.partNumber.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        category: dto.category.trim().toUpperCase(),
        unitOfMeasure: (dto.unitOfMeasure || 'PIECE').toUpperCase(),
        unitPrice: dto.unitPrice,
        costPrice: dto.costPrice,
        minStockAlert: dto.minStockAlert ?? 5,
        compatibleModels: dto.compatibleModels || [],
      },
    });

    // Seed initial stock if specified
    if (dto.initialStock && dto.initialStock > 0) {
      let locationId = dto.initialLocationId;
      if (!locationId) {
        const defaultLoc = await this.ensureDefaultLocation(tenantId);
        locationId = defaultLoc.id;
      }

      await this.adjustStock(tenantId, actorUserId, {
        partId: part.id,
        locationId,
        transactionType: InventoryTransactionType.PURCHASE_RECEIPT,
        quantityDelta: dto.initialStock,
        unitCost: dto.costPrice || dto.unitPrice,
        notes: 'Initial stock on part creation',
      });
    }

    return this.getPartById(tenantId, part.id);
  }

  async updatePart(tenantId: string, id: string, dto: UpdateSparePartDto) {
    const part = await this.prisma.sparePart.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!part) {
      throw new NotFoundException(`Spare part ${id} not found`);
    }

    const updated = await this.prisma.sparePart.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
        ...(dto.category ? { category: dto.category.trim().toUpperCase() } : {}),
        ...(dto.unitOfMeasure ? { unitOfMeasure: dto.unitOfMeasure.toUpperCase() } : {}),
        ...(dto.unitPrice !== undefined ? { unitPrice: dto.unitPrice } : {}),
        ...(dto.costPrice !== undefined ? { costPrice: dto.costPrice } : {}),
        ...(dto.minStockAlert !== undefined ? { minStockAlert: dto.minStockAlert } : {}),
        ...(dto.compatibleModels !== undefined ? { compatibleModels: dto.compatibleModels } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return this.getPartById(tenantId, updated.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Storage Locations (Warehouses & Field Vans)
  // ─────────────────────────────────────────────────────────────────────────
  async listLocations(tenantId: string) {
    await this.ensureDefaultLocation(tenantId);

    const locations = await this.prisma.storageLocation.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        inventory: {
          select: {
            quantityOnHand: true,
            partId: true,
          },
        },
      },
    });

    return locations.map((loc) => ({
      id: loc.id,
      tenantId: loc.tenantId,
      name: loc.name,
      code: loc.code,
      type: loc.type,
      address: loc.address,
      isActive: loc.isActive,
      totalItems: loc.inventory.length,
      totalUnits: loc.inventory.reduce((sum, inv) => sum + inv.quantityOnHand, 0),
      createdAt: loc.createdAt,
      updatedAt: loc.updatedAt,
    }));
  }

  async createLocation(tenantId: string, dto: CreateStorageLocationDto) {
    const existing = await this.prisma.storageLocation.findFirst({
      where: {
        tenantId,
        code: { equals: dto.code.trim(), mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(`Storage location code ${dto.code} already exists`);
    }

    return this.prisma.storageLocation.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        type: (dto.type || 'WAREHOUSE').toUpperCase(),
        address: dto.address?.trim(),
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Stock Adjustments & Transactions
  // ─────────────────────────────────────────────────────────────────────────
  async adjustStock(tenantId: string, actorUserId: string, dto: AdjustStockDto) {
    const [part, location] = await Promise.all([
      this.prisma.sparePart.findFirst({
        where: { id: dto.partId, tenantId, deletedAt: null },
      }),
      this.prisma.storageLocation.findFirst({
        where: { id: dto.locationId, tenantId, isActive: true },
      }),
    ]);

    if (!part) throw new NotFoundException(`Spare part ${dto.partId} not found`);
    if (!location) throw new NotFoundException(`Storage location ${dto.locationId} not found`);

    return this.prisma.$transaction(async (tx) => {
      let inv = await tx.partInventory.findUnique({
        where: {
          uq_part_inventory_tenant_part_location: {
            tenantId,
            partId: dto.partId,
            locationId: dto.locationId,
          },
        },
      });

      if (!inv) {
        inv = await tx.partInventory.create({
          data: {
            tenantId,
            partId: dto.partId,
            locationId: dto.locationId,
            quantityOnHand: 0,
          },
        });
      }

      const newQty = inv.quantityOnHand + dto.quantityDelta;
      if (newQty < 0) {
        throw new BadRequestException(
          `Insufficient stock for ${part.partNumber} at ${location.name}. Current: ${inv.quantityOnHand}, Requested deduction: ${Math.abs(dto.quantityDelta)}`,
        );
      }

      const updatedInv = await tx.partInventory.update({
        where: { id: inv.id },
        data: {
          quantityOnHand: newQty,
          ...(dto.quantityDelta > 0 ? { lastRestockedAt: new Date() } : {}),
        },
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          tenantId,
          partId: dto.partId,
          locationId: dto.locationId,
          transactionType: dto.transactionType,
          quantityDelta: dto.quantityDelta,
          unitCost: dto.unitCost || part.costPrice || part.unitPrice,
          performedByUserId: actorUserId,
          notes: dto.notes,
        },
      });

      return {
        inventory: updatedInv,
        transaction,
        currentStock: newQty,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Transfer Stock Between Locations (Warehouse <-> Service Van)
  // ─────────────────────────────────────────────────────────────────────────
  async transferStock(tenantId: string, actorUserId: string, dto: TransferStockDto) {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('Source and destination storage locations cannot be the same');
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException('Transfer quantity must be at least 1');
    }

    const [part, fromLoc, toLoc] = await Promise.all([
      this.prisma.sparePart.findFirst({
        where: { id: dto.partId, tenantId, deletedAt: null },
      }),
      this.prisma.storageLocation.findFirst({
        where: { id: dto.fromLocationId, tenantId, isActive: true },
      }),
      this.prisma.storageLocation.findFirst({
        where: { id: dto.toLocationId, tenantId, isActive: true },
      }),
    ]);

    if (!part) throw new NotFoundException(`Spare part ${dto.partId} not found`);
    if (!fromLoc) throw new NotFoundException(`Source location ${dto.fromLocationId} not found`);
    if (!toLoc) throw new NotFoundException(`Destination location ${dto.toLocationId} not found`);

    return this.prisma.$transaction(async (tx) => {
      // 1. Check & decrement source location
      const sourceInv = await tx.partInventory.findUnique({
        where: {
          uq_part_inventory_tenant_part_location: {
            tenantId,
            partId: part.id,
            locationId: fromLoc.id,
          },
        },
      });

      const currentSourceQty = sourceInv ? sourceInv.quantityOnHand : 0;
      if (currentSourceQty < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock of ${part.partNumber} at ${fromLoc.name}. Available: ${currentSourceQty}, Requested transfer: ${dto.quantity}`,
        );
      }

      const updatedSourceInv = await tx.partInventory.update({
        where: { id: sourceInv!.id },
        data: {
          quantityOnHand: currentSourceQty - dto.quantity,
        },
      });

      // 2. Increment destination location
      const destInv = await tx.partInventory.findUnique({
        where: {
          uq_part_inventory_tenant_part_location: {
            tenantId,
            partId: part.id,
            locationId: toLoc.id,
          },
        },
      });

      let updatedDestInv;
      if (destInv) {
        updatedDestInv = await tx.partInventory.update({
          where: { id: destInv.id },
          data: {
            quantityOnHand: destInv.quantityOnHand + dto.quantity,
            lastRestockedAt: new Date(),
          },
        });
      } else {
        updatedDestInv = await tx.partInventory.create({
          data: {
            tenantId,
            partId: part.id,
            locationId: toLoc.id,
            quantityOnHand: dto.quantity,
            lastRestockedAt: new Date(),
          },
        });
      }

      // 3. Record Inventory Transactions (Source Out, Destination In)
      const unitCost = part.costPrice || part.unitPrice;
      const transferNote = dto.notes ? ` (${dto.notes})` : '';

      await tx.inventoryTransaction.create({
        data: {
          tenantId,
          partId: part.id,
          locationId: fromLoc.id,
          transactionType: InventoryTransactionType.TRANSFER,
          quantityDelta: -dto.quantity,
          unitCost,
          referenceType: 'LOCATION_TRANSFER',
          referenceId: toLoc.id,
          performedByUserId: actorUserId,
          notes: `Transferred OUT to ${toLoc.name}${transferNote}`,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          tenantId,
          partId: part.id,
          locationId: toLoc.id,
          transactionType: InventoryTransactionType.TRANSFER,
          quantityDelta: dto.quantity,
          unitCost,
          referenceType: 'LOCATION_TRANSFER',
          referenceId: fromLoc.id,
          performedByUserId: actorUserId,
          notes: `Transferred IN from ${fromLoc.name}${transferNote}`,
        },
      });

      return {
        part: { id: part.id, partNumber: part.partNumber, name: part.name },
        source: {
          locationId: fromLoc.id,
          locationName: fromLoc.name,
          previousStock: currentSourceQty,
          currentStock: updatedSourceInv.quantityOnHand,
        },
        destination: {
          locationId: toLoc.id,
          locationName: toLoc.name,
          previousStock: destInv ? destInv.quantityOnHand : 0,
          currentStock: updatedDestInv.quantityOnHand,
        },
        transferredQuantity: dto.quantity,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Inventory Summary / KPI Metrics
  // ─────────────────────────────────────────────────────────────────────────
  async getInventorySummary(tenantId: string) {
    const [parts, locations] = await Promise.all([
      this.prisma.sparePart.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          inventory: true,
        },
      }),
      this.prisma.storageLocation.count({
        where: { tenantId, isActive: true },
      }),
    ]);

    let totalUnitsOnHand = 0;
    let totalValuation = 0;
    let lowStockCount = 0;

    for (const part of parts) {
      const stock = part.inventory.reduce((sum, inv) => sum + inv.quantityOnHand, 0);
      totalUnitsOnHand += stock;
      const valuationCost = part.costPrice ? Number(part.costPrice) : Number(part.unitPrice);
      totalValuation += stock * valuationCost;
      if (stock <= part.minStockAlert) {
        lowStockCount++;
      }
    }

    return {
      totalSkus: parts.length,
      totalUnitsOnHand,
      totalValuation: Math.round(totalValuation * 100) / 100,
      lowStockCount,
      storageLocationsCount: locations,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Consume Part on Ticket / Work Order
  // ─────────────────────────────────────────────────────────────────────────
  async consumePart(tenantId: string, actorUserId: string, dto: ConsumePartDto) {
    const ticket = await this.prisma.serviceTicket.findFirst({
      where: { id: dto.ticketId, tenantId, deletedAt: null },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket ${dto.ticketId} not found`);
    }

    if (['CLOSED', 'CANCELLED'].includes(ticket.status)) {
      throw new BadRequestException(`Cannot consume parts for a ${ticket.status} ticket`);
    }

    if (dto.workOrderId) {
      const wo = await this.prisma.workOrder.findFirst({
        where: { id: dto.workOrderId, tenantId, ticketId: ticket.id },
      });
      if (!wo) {
        throw new NotFoundException(`Work Order ${dto.workOrderId} not found for this ticket`);
      }
    }

    const part = await this.prisma.sparePart.findFirst({
      where: { id: dto.partId, tenantId, deletedAt: null, isActive: true },
      include: {
        inventory: {
          include: { location: true },
        },
      },
    });

    if (!part) {
      throw new NotFoundException(`Active spare part ${dto.partId} not found`);
    }

    // Determine storage location
    let targetLocationId = dto.locationId;
    if (!targetLocationId) {
      // Find location with highest quantity on hand
      const sorted = [...part.inventory].sort((a, b) => b.quantityOnHand - a.quantityOnHand);
      const bestLoc = sorted[0];
      if (bestLoc && bestLoc.quantityOnHand >= dto.quantity) {
        targetLocationId = bestLoc.locationId;
      } else {
        const defaultLoc = await this.ensureDefaultLocation(tenantId);
        targetLocationId = defaultLoc.id;
      }
    }

    const location = await this.prisma.storageLocation.findFirst({
      where: { id: targetLocationId, tenantId },
    });

    if (!location) {
      throw new NotFoundException(`Storage location ${targetLocationId} not found`);
    }

    const resolvedLocationId: string = location.id;
    const unitPrice = dto.isWarrantyCovered ? 0 : (dto.unitPrice !== undefined ? dto.unitPrice : Number(part.unitPrice));
    const totalAmount = unitPrice * dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      // Check inventory at location
      let inv = await tx.partInventory.findUnique({
        where: {
          uq_part_inventory_tenant_part_location: {
            tenantId,
            partId: part.id,
            locationId: resolvedLocationId,
          },
        },
      });

      if (!inv || inv.quantityOnHand < dto.quantity) {
        const available = inv ? inv.quantityOnHand : 0;
        throw new BadRequestException(
          `Insufficient stock for ${part.partNumber} at ${location.name}. Required: ${dto.quantity}, Available: ${available}`,
        );
      }

      // Decrement stock
      await tx.partInventory.update({
        where: { id: inv.id },
        data: {
          quantityOnHand: inv.quantityOnHand - dto.quantity,
        },
      });

      // Record transaction
      const transType = dto.workOrderId
        ? InventoryTransactionType.WORK_ORDER_CONSUMPTION
        : InventoryTransactionType.TICKET_CONSUMPTION;

      await tx.inventoryTransaction.create({
        data: {
          tenantId,
          partId: part.id,
          locationId: resolvedLocationId,
          transactionType: transType,
          quantityDelta: -dto.quantity,
          unitCost: part.costPrice || part.unitPrice,
          referenceType: dto.workOrderId ? 'WORK_ORDER' : 'SERVICE_TICKET',
          referenceId: dto.workOrderId || ticket.id,
          performedByUserId: actorUserId,
          notes: dto.notes || `Consumed on ${ticket.ticketNumber}`,
        },
      });

      // Record consumption
      const consumption = await tx.ticketPartConsumption.create({
        data: {
          tenantId,
          ticketId: ticket.id,
          workOrderId: dto.workOrderId,
          partId: part.id,
          locationId: resolvedLocationId,
          quantity: dto.quantity,
          unitPrice,
          totalAmount,
          isWarrantyCovered: dto.isWarrantyCovered || false,
          consumedByUserId: actorUserId,
          notes: dto.notes,
        },
        include: {
          part: true,
          location: true,
          consumedByUser: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      // Append timeline audit entry to ticket
      const warrantyTag = dto.isWarrantyCovered ? ' (Warranty Claim - ₹0.00 billed)' : '';
      await tx.ticketTimeline.create({
        data: {
          tenantId,
          ticketId: ticket.id,
          eventType: TicketEventType.NOTE_ADDED,
          actorUserId,
          note: `Consumed replacement part: ${dto.quantity}x ${part.partNumber} (${part.name}) from ${location.name}. Amount: ₹${totalAmount.toFixed(2)}${warrantyTag}`,
          metadata: {
            event: 'PART_CONSUMED',
            consumptionId: consumption.id,
            partNumber: part.partNumber,
            quantity: dto.quantity,
            totalAmount,
            isWarrantyCovered: dto.isWarrantyCovered,
          },
        },
      });

      return consumption;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // List Consumptions for Ticket with Billing Calculation
  // ─────────────────────────────────────────────────────────────────────────
  async getTicketConsumptions(tenantId: string, ticketId: string) {
    const consumptions = await this.prisma.ticketPartConsumption.findMany({
      where: { tenantId, ticketId },
      include: {
        part: true,
        location: true,
        workOrder: {
          select: { id: true, orderNumber: true, status: true },
        },
        consumedByUser: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { consumedAt: 'asc' },
    });

    let subtotal = 0;
    let warrantyDiscount = 0;
    let totalBillable = 0;

    const formatted = consumptions.map((c) => {
      const qty = c.quantity;
      const fullPrice = Number(c.part.unitPrice);
      const totalCost = fullPrice * qty;

      if (c.isWarrantyCovered) {
        warrantyDiscount += totalCost;
      } else {
        totalBillable += Number(c.totalAmount);
      }
      subtotal += totalCost;

      return {
        ...c,
        unitPrice: Number(c.unitPrice),
        totalAmount: Number(c.totalAmount),
        catalogUnitPrice: fullPrice,
        fullLineTotal: totalCost,
      };
    });

    return {
      consumptions: formatted,
      subtotal: Math.round(subtotal * 100) / 100,
      warrantyDiscount: Math.round(warrantyDiscount * 100) / 100,
      totalBillable: Math.round(totalBillable * 100) / 100,
      partsCount: formatted.reduce((sum, c) => sum + c.quantity, 0),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Remove / Revert Consumption
  // ─────────────────────────────────────────────────────────────────────────
  async removeConsumption(tenantId: string, actorUserId: string, consumptionId: string) {
    const consumption = await this.prisma.ticketPartConsumption.findFirst({
      where: { id: consumptionId, tenantId },
      include: {
        part: true,
        location: true,
        ticket: true,
      },
    });

    if (!consumption) {
      throw new NotFoundException(`Part consumption ${consumptionId} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Restore inventory if location exists
      if (consumption.locationId) {
        const inv = await tx.partInventory.findUnique({
          where: {
            uq_part_inventory_tenant_part_location: {
              tenantId,
              partId: consumption.partId,
              locationId: consumption.locationId,
            },
          },
        });

        if (inv) {
          await tx.partInventory.update({
            where: { id: inv.id },
            data: { quantityOnHand: inv.quantityOnHand + consumption.quantity },
          });
        }

        // Record return transaction
        await tx.inventoryTransaction.create({
          data: {
            tenantId,
            partId: consumption.partId,
            locationId: consumption.locationId,
            transactionType: InventoryTransactionType.RETURN,
            quantityDelta: consumption.quantity,
            unitCost: consumption.part.costPrice || consumption.part.unitPrice,
            referenceType: 'CONSUMPTION_REVERT',
            referenceId: consumption.ticketId,
            performedByUserId: actorUserId,
            notes: `Voided part allocation for ${consumption.ticket.ticketNumber}`,
          },
        });
      }

      // Delete consumption record
      await tx.ticketPartConsumption.delete({
        where: { id: consumption.id },
      });

      // Audit log on ticket timeline
      await tx.ticketTimeline.create({
        data: {
          tenantId,
          ticketId: consumption.ticketId,
          eventType: TicketEventType.NOTE_ADDED,
          actorUserId,
          note: `Removed consumed part: ${consumption.quantity}x ${consumption.part.partNumber} (${consumption.part.name}). Restocked to inventory.`,
          metadata: {
            event: 'PART_CONSUMPTION_REVERTED',
            partNumber: consumption.part.partNumber,
            quantity: consumption.quantity,
          },
        },
      });

      return { success: true, message: 'Consumption voided and inventory restored' };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Inventory Audit Transactions Ledger
  // ─────────────────────────────────────────────────────────────────────────
  async listTransactions(tenantId: string, partId?: string, locationId?: string) {
    return this.prisma.inventoryTransaction.findMany({
      where: {
        tenantId,
        ...(partId ? { partId } : {}),
        ...(locationId ? { locationId } : {}),
      },
      include: {
        part: {
          select: { id: true, partNumber: true, name: true },
        },
        location: {
          select: { id: true, name: true, code: true, type: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
