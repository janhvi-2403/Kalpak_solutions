'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Package,
  Plus,
  Trash2,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import { Button, Input, Dialog, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';


interface ConsumedPartItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  isWarrantyCovered: boolean;
  consumedAt: string;
  notes?: string;
  part: {
    id: string;
    partNumber: string;
    name: string;
    category: string;
    unitOfMeasure: string;
    unitPrice: number;
  };
  location?: {
    id: string;
    name: string;
    code: string;
  };
  consumedByUser?: {
    id: string;
    fullName: string;
  };
}

interface BillingSummary {
  consumptions: ConsumedPartItem[];
  subtotal: number;
  warrantyDiscount: number;
  totalBillable: number;
  partsCount: number;
}

interface SparePartCatalogOption {
  id: string;
  partNumber: string;
  name: string;
  unitPrice: number;
  totalStock: number;
  unitOfMeasure: string;
  inventory: Array<{
    locationId: string;
    quantityOnHand: number;
    location: {
      id: string;
      name: string;
      code: string;
    };
  }>;
}

interface TicketPartsSectionProps {
  ticketId: string;
}

export function TicketPartsSection({ ticketId }: TicketPartsSectionProps) {
  const [billing, setBilling] = useState<BillingSummary>({
    consumptions: [],
    subtotal: 0,
    warrantyDiscount: 0,
    totalBillable: 0,
    partsCount: 0,
  });
  const [catalog, setCatalog] = useState<SparePartCatalogOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state
  const [selectedPartId, setSelectedPartId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isWarranty, setIsWarranty] = useState(false);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchConsumptions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiClient<BillingSummary>(`/inventory/consumptions/by-ticket/${ticketId}`);
      if (res) {
        setBilling(res);
      }
    } catch (err) {
      console.error('Failed to load parts consumptions', err);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  const fetchCatalog = useCallback(async () => {
    try {
      const res = await apiClient<any>('/inventory/parts?pageSize=100');
      if (res && res.data) {
        const partsList = res.data || [];
        setCatalog(partsList);
        const firstPart = partsList[0];
        if (firstPart && !selectedPartId) {
          setSelectedPartId(firstPart.id);
          const firstInv = firstPart.inventory?.[0];
          if (firstInv) {
            setSelectedLocationId(firstInv.locationId);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load catalog for consumption', err);
    }
  }, [selectedPartId]);

  useEffect(() => {
    fetchConsumptions();
    fetchCatalog();
  }, [fetchConsumptions, fetchCatalog]);

  const selectedPart = catalog.find((p) => p.id === selectedPartId);
  const selectedLocationInventory = selectedPart?.inventory.find(
    (inv) => inv.locationId === selectedLocationId,
  );
  const availableStockAtLocation = selectedLocationInventory?.quantityOnHand ?? 0;

  const handleConsumeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        setFormError('Quantity must be a positive number');
        setIsSubmitting(false);
        return;
      }

      if (availableStockAtLocation < qty) {
        setFormError(
          `Insufficient stock at chosen location. Available: ${availableStockAtLocation}, Requested: ${qty}`,
        );
        setIsSubmitting(false);
        return;
      }

      await apiClient('/inventory/consume', {
        method: 'POST',
        body: JSON.stringify({
          ticketId,
          partId: selectedPartId,
          locationId: selectedLocationId || undefined,
          quantity: qty,
          isWarrantyCovered: isWarranty,
          notes: notes.trim() || undefined,
        }),
      });

      setIsModalOpen(false);
      setNotes('');
      setQuantity('1');
      setIsWarranty(false);
      await fetchConsumptions();
      await fetchCatalog();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while allocating part');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveConsumption = async (consumptionId: string) => {
    if (!confirm('Are you sure you want to revert this part allocation and restore inventory?')) {
      return;
    }
    try {
      await apiClient(`/inventory/consumptions/${consumptionId}`, {
        method: 'DELETE',
      });
      await fetchConsumptions();
      await fetchCatalog();
    } catch (err) {
      console.error('Failed to void consumption', err);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm mt-6">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-900">
                Replacement Parts & Materials
              </CardTitle>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {billing.partsCount} Units Consumed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Track spare parts installed on-site, warranty coverage claims, and live billing amounts.
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Consume / Allocate Part
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Consumed Parts Table */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading parts consumption records...
          </div>
        ) : billing.consumptions.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/60 rounded-lg border border-dashed border-slate-200 text-slate-500 space-y-1">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No spare parts consumed yet</p>
            <p className="text-[11px] text-slate-400">
              When technicians replace components on-site, log them here to update inventory and generate customer billing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Part SKU</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Depot / Van</th>
                  <th className="py-2.5 px-3">Qty</th>
                  <th className="py-2.5 px-3">Unit Price</th>
                  <th className="py-2.5 px-3">Warranty</th>
                  <th className="py-2.5 px-3">Billed Total</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {billing.consumptions.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[11px]">
                        {item.part?.partNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{item.part?.name}</div>
                      {item.notes && <div className="text-[10px] text-slate-400">{item.notes}</div>}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {item.location?.code || 'MAIN'}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {item.quantity} {item.part?.unitOfMeasure || 'pcs'}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      ₹{Number(item.part?.unitPrice || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.isWarrantyCovered ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Warranty (100% Free)
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          Billable
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      ₹{Number(item.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleRemoveConsumption(item.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Void and restock inventory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Live Billing Summary Banner */}
        {billing.consumptions.length > 0 && (
          <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Parts Billing Breakdown
                </h5>
                <p className="text-[11px] text-slate-400">
                  Subtotal: ₹{billing.subtotal.toLocaleString('en-IN')} | Warranty Claims: -₹{billing.warrantyDiscount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <div className="text-right flex items-center gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Billable to Customer
                </span>
                <div className="text-lg font-black text-emerald-400 font-mono">
                  ₹{billing.totalBillable.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Modal: Consume Part */}
      <Dialog isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Allocate Replacement Part">
        <form onSubmit={handleConsumeSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {formError}
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Select Spare Part *</label>
            <select
              required
              value={selectedPartId}
              onChange={(e) => {
                const partId = e.target.value;
                setSelectedPartId(partId);
                const p = catalog.find((x) => x.id === partId);
                const firstInv = p?.inventory?.[0];
                if (firstInv) {
                  setSelectedLocationId(firstInv.locationId);
                }
              }}
              className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-700 focus:outline-none font-medium"
            >
              {catalog.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.partNumber} - {part.name} (Total Stock: {part.totalStock} {part.unitOfMeasure}s | ₹{part.unitPrice})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Storage Location (Depot/Van) *</label>
              <select
                required
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-700 focus:outline-none font-medium"
              >
                {selectedPart?.inventory && selectedPart.inventory.length > 0 ? (
                  selectedPart.inventory.map((inv) => (
                    <option key={inv.locationId} value={inv.locationId}>
                      {inv.location.name} ({inv.location.code}) — {inv.quantityOnHand} available
                    </option>
                  ))
                ) : (
                  <option value="">No stock locations found</option>
                )}
              </select>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                Stock at chosen depot: <span className="font-bold text-blue-600">{availableStockAtLocation}</span> units
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Quantity *</label>
              <Input
                required
                type="number"
                min="1"
                max={availableStockAtLocation || 1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isWarranty}
                onChange={(e) => setIsWarranty(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-800">
                Waive Billing under Machine Warranty
              </span>
            </label>
            <p className="text-[11px] text-slate-500 pl-6">
              If checked, customer is billed ₹0.00 while the internal inventory ledger records the replacement for manufacturer warranty claims.
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Installation Notes / Reason</label>
            <textarea
              placeholder="Replaced worn bearing during axis diagnostic, customer acknowledged..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full text-xs rounded-md border border-slate-300 p-2 focus:outline-none focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || availableStockAtLocation <= 0}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
            >
              {isSubmitting ? 'Allocating...' : 'Allocate & Deduct Stock'}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
