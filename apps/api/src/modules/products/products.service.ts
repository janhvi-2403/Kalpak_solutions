import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { CreateCustomerAssetDto, UpdateCustomerAssetDto } from './dto/customer-asset.dto';
import { AuditEventType } from '@kalpak/types';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  // --------------------------------------------------------------------------
  // Product Catalog
  // --------------------------------------------------------------------------

  async listProducts(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { assets: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      departmentId: p.departmentId,
      departmentName: p.department?.name || null,
      name: p.name,
      modelNumber: p.modelNumber,
      category: p.category,
      description: p.description,
      hasWarranty: p.hasWarranty,
      warrantyPeriodMonths: p.warrantyPeriodMonths,
      assetCount: p._count.assets,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  async getProduct(tenantId: string, productId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) {
      throw new NotFoundException('Product not found');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        deletedAt: null,
      },
      include: {
        department: true,
        assets: {
          where: { deletedAt: null },
          include: {
            customer: {
              select: {
                id: true,
                companyName: true,
                contactPerson: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async createProduct(tenantId: string, actorId: string, dto: CreateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: {
        tenantId,
        modelNumber: dto.modelNumber.trim(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Product with model number '${dto.modelNumber}' already exists`);
    }

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        modelNumber: dto.modelNumber.trim(),
        category: dto.category.trim(),
        departmentId: dto.departmentId || null,
        description: dto.description?.trim(),
        hasWarranty: dto.hasWarranty ?? true,
        warrantyPeriodMonths: dto.warrantyPeriodMonths ?? 12,
      },
      include: {
        department: true,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.PRODUCT_CREATED,
      resourceType: 'PRODUCT',
      resourceId: product.id,
      action: 'CREATE_PRODUCT',
      metadata: { name: product.name, modelNumber: product.modelNumber },
    });

    return product;
  }

  async updateProduct(tenantId: string, productId: string, actorId: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    if (dto.modelNumber && dto.modelNumber.trim() !== existing.modelNumber) {
      const duplicate = await this.prisma.product.findFirst({
        where: {
          tenantId,
          modelNumber: dto.modelNumber.trim(),
          id: { not: productId },
          deletedAt: null,
        },
      });

      if (duplicate) {
        throw new ConflictException(`Model number '${dto.modelNumber}' is already in use`);
      }
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name?.trim(),
        modelNumber: dto.modelNumber?.trim(),
        category: dto.category?.trim(),
        departmentId: dto.departmentId !== undefined ? dto.departmentId : undefined,
        description: dto.description?.trim(),
        hasWarranty: dto.hasWarranty,
        warrantyPeriodMonths: dto.warrantyPeriodMonths,
      },
      include: {
        department: true,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.PRODUCT_UPDATED,
      resourceType: 'PRODUCT',
      resourceId: updated.id,
      action: 'UPDATE_PRODUCT',
      metadata: { ...dto },
    });

    return updated;
  }

  async deleteProduct(tenantId: string, productId: string, actorId: string) {
    const existing = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.PRODUCT_DELETED,
      resourceType: 'PRODUCT',
      resourceId: productId,
      action: 'DELETE_PRODUCT',
      metadata: { name: existing.name },
    });

    return { success: true, message: 'Product deleted successfully' };
  }

  // --------------------------------------------------------------------------
  // Customer Installed Assets
  // --------------------------------------------------------------------------

  async listAssets(tenantId: string, customerId?: string, search?: string) {
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (customerId) {
      where.customerId = customerId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { serialNumber: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
        { product: { name: { contains: term, mode: 'insensitive' } } },
        { customer: { companyName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const assets = await this.prisma.customerAsset.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            contactPerson: true,
            phone: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            modelNumber: true,
            category: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return assets.map((a) => ({
      id: a.id,
      tenantId: a.tenantId,
      customerId: a.customerId,
      customerName: a.customer.companyName,
      contactPerson: a.customer.contactPerson,
      productId: a.productId,
      productName: a.product.name,
      modelNumber: a.product.modelNumber,
      serialNumber: a.serialNumber,
      installationDate: a.installationDate,
      warrantyEndDate: a.warrantyEndDate,
      location: a.location,
      status: a.status,
      notes: a.notes,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  }

  async getAsset(tenantId: string, assetId: string) {
    const asset = await this.prisma.customerAsset.findFirst({
      where: {
        id: assetId,
        tenantId,
        deletedAt: null,
      },
      include: {
        customer: true,
        product: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Customer asset not found');
    }

    return asset;
  }

  async createAsset(tenantId: string, actorId: string, dto: CreateCustomerAssetDto) {
    const existing = await this.prisma.customerAsset.findFirst({
      where: {
        tenantId,
        serialNumber: dto.serialNumber.trim(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Equipment with serial number '${dto.serialNumber}' already exists`);
    }

    const asset = await this.prisma.customerAsset.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        productId: dto.productId,
        serialNumber: dto.serialNumber.trim(),
        installationDate: dto.installationDate ? new Date(dto.installationDate) : null,
        warrantyEndDate: dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null,
        location: dto.location?.trim(),
        status: dto.status || 'OPERATIONAL',
        notes: dto.notes?.trim(),
      },
      include: {
        customer: true,
        product: true,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.ASSET_CREATED,
      resourceType: 'ASSET',
      resourceId: asset.id,
      action: 'CREATE_ASSET',
      metadata: { serialNumber: asset.serialNumber },
    });

    return asset;
  }

  async updateAsset(tenantId: string, assetId: string, actorId: string, dto: UpdateCustomerAssetDto) {
    const existing = await this.prisma.customerAsset.findFirst({
      where: { id: assetId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Customer asset not found');
    }

    const updated = await this.prisma.customerAsset.update({
      where: { id: assetId },
      data: {
        serialNumber: dto.serialNumber?.trim(),
        installationDate: dto.installationDate !== undefined ? (dto.installationDate ? new Date(dto.installationDate) : null) : undefined,
        warrantyEndDate: dto.warrantyEndDate !== undefined ? (dto.warrantyEndDate ? new Date(dto.warrantyEndDate) : null) : undefined,
        location: dto.location?.trim(),
        status: dto.status,
        notes: dto.notes?.trim(),
      },
      include: {
        customer: true,
        product: true,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.ASSET_UPDATED,
      resourceType: 'ASSET',
      resourceId: updated.id,
      action: 'UPDATE_ASSET',
      metadata: { ...dto },
    });

    return updated;
  }

  async deleteAsset(tenantId: string, assetId: string, actorId: string) {
    const existing = await this.prisma.customerAsset.findFirst({
      where: { id: assetId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Customer asset not found');
    }

    await this.prisma.customerAsset.update({
      where: { id: assetId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.ASSET_DELETED,
      resourceType: 'ASSET',
      resourceId: assetId,
      action: 'DELETE_ASSET',
      metadata: { serialNumber: existing.serialNumber },
    });

    return { success: true, message: 'Equipment asset deleted successfully' };
  }

  // --------------------------------------------------------------------------
  // Services Master Catalog (Installation, Repair, Maintenance, Warranty, etc.)
  // --------------------------------------------------------------------------

  async listServices(tenantId: string) {
    const services = await this.prisma.serviceCatalog.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return services.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      name: s.name,
      code: s.code,
      description: s.description,
      isActive: s.isActive,
      ticketCount: s._count.tickets,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async getService(tenantId: string, serviceId: string) {
    const service = await this.prisma.serviceCatalog.findFirst({
      where: {
        id: serviceId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!service) {
      throw new NotFoundException('Service entry not found');
    }

    return service;
  }

  async createService(
    tenantId: string,
    actorId: string,
    dto: { name: string; code: string; description?: string; isActive?: boolean }
  ) {
    const existing = await this.prisma.serviceCatalog.findFirst({
      where: {
        tenantId,
        code: dto.code.trim().toUpperCase(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException(`Service with code "${dto.code}" already exists in your organization`);
    }

    const service = await this.prisma.serviceCatalog.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        description: dto.description?.trim(),
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.PRODUCT_CREATED,
      resourceType: 'SERVICE_CATALOG',
      resourceId: service.id,
      action: 'CREATE_SERVICE',
      metadata: { name: service.name, code: service.code },
    });

    return service;
  }

  async updateService(
    tenantId: string,
    serviceId: string,
    actorId: string,
    dto: { name?: string; description?: string; isActive?: boolean }
  ) {
    const existing = await this.prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Service entry not found');
    }

    const updated = await this.prisma.serviceCatalog.update({
      where: { id: serviceId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.PRODUCT_UPDATED,
      resourceType: 'SERVICE_CATALOG',
      resourceId: updated.id,
      action: 'UPDATE_SERVICE',
      metadata: { ...dto },
    });

    return updated;
  }

  async deleteService(tenantId: string, serviceId: string, actorId: string) {
    const existing = await this.prisma.serviceCatalog.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Service entry not found');
    }

    await this.prisma.serviceCatalog.update({
      where: { id: serviceId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.record({
      tenantId,
      actorId,
      eventType: AuditEventType.PRODUCT_DELETED,
      resourceType: 'SERVICE_CATALOG',
      resourceId: serviceId,
      action: 'DELETE_SERVICE',
      metadata: { code: existing.code },
    });

    return { success: true, message: 'Service catalog item deleted successfully' };
  }
}
