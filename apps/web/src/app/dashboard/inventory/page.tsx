'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Package,
  Plus,
  Search,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  Boxes,
  Truck,
  ArrowUpDown,
  ArrowRightLeft,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Card,
  CardHeader,
  CardContent,
} from '@/components/ui';


interface StorageLocation {
  id: string;
  name: string;
  code: string;
  type: string;
  address?: string;
  totalItems: number;
  totalUnits: number;
}

interface PartInventoryItem {
  id: string;
  locationId: string;
  quantityOnHand: number;
  location: {
    id: string;
    name: string;
    code: string;
    type: string;
  };
}

interface SparePart {
  id: string;
  partNumber: string;
  name: string;
  description?: string;
  category: string;
  unitOfMeasure: string;
  unitPrice: number;
  costPrice?: number;
  minStockAlert: number;
  compatibleModels: string[];
  totalStock: number;
  isLowStock: boolean;
  inventory: PartInventoryItem[];
}

interface InventorySummary {
  totalSkus: number;
  totalUnitsOnHand: number;
  totalValuation: number;
  lowStockCount: number;
  storageLocationsCount: number;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'locations' | 'audit'>('catalog');
  const [parts, setParts] = useState<SparePart[]>([]);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalSkus: 0,
    totalUnitsOnHand: 0,
    totalValuation: 0,
    lowStockCount: 0,
    storageLocationsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [isTransferStockOpen, setIsTransferStockOpen] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [selectedPartForAdjust, setSelectedPartForAdjust] = useState<SparePart | null>(null);
  const [selectedPartForTransfer, setSelectedPartForTransfer] = useState<SparePart | null>(null);

  // Form states
  const [partForm, setPartForm] = useState({
    partNumber: '',
    name: '',
    description: '',
    category: 'BEARINGS',
    unitOfMeasure: 'PIECE',
    unitPrice: '',
    costPrice: '',
    minStockAlert: '5',
    compatibleModels: '',
    initialStock: '10',
    initialLocationId: '',
  });

  const [adjustForm, setAdjustForm] = useState({
    partId: '',
    locationId: '',
    transactionType: 'PURCHASE_RECEIPT',
    quantityDelta: '',
    unitCost: '',
    notes: '',
  });

  const [transferForm, setTransferForm] = useState({
    partId: '',
    fromLocationId: '',
    toLocationId: '',
    quantity: '1',
    notes: '',
  });

  const [locationForm, setLocationForm] = useState({
    name: '',
    code: '',
    type: 'SERVICE_VAN',
    address: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [partsRes, locsRes, sumRes] = await Promise.all([
        apiClient<any>(`/inventory/parts?search=${encodeURIComponent(searchTerm)}&lowStockOnly=${lowStockFilter}`),
        apiClient<any>('/inventory/locations'),
        apiClient<any>('/inventory/summary'),
      ]);

      if (partsRes && partsRes.data) {
        setParts(partsRes.data || []);
      }
      if (locsRes && Array.isArray(locsRes)) {
        setLocations(locsRes || []);
        const firstLoc = locsRes[0];
        if (firstLoc && !partForm.initialLocationId) {
          setPartForm((prev) => ({ ...prev, initialLocationId: firstLoc.id }));
        }
      }
      if (sumRes) {
        setSummary(sumRes);
      }
    } catch (err) {
      console.error('Failed to load inventory data', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, lowStockFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Categories list
  const categories = ['ALL', ...Array.from(new Set(parts.map((p) => p.category)))];

  const filteredParts = parts.filter((p) => {
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
    return true;
  });

  // Handle Add Part submit
  const handleAddPart = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      const payload = {
        partNumber: partForm.partNumber.trim().toUpperCase(),
        name: partForm.name.trim(),
        description: partForm.description.trim() || undefined,
        category: partForm.category.trim().toUpperCase(),
        unitOfMeasure: partForm.unitOfMeasure.toUpperCase(),
        unitPrice: parseFloat(partForm.unitPrice) || 0,
        costPrice: partForm.costPrice ? parseFloat(partForm.costPrice) : undefined,
        minStockAlert: parseInt(partForm.minStockAlert, 10) || 5,
        compatibleModels: partForm.compatibleModels
          ? partForm.compatibleModels.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        initialStock: partForm.initialStock ? parseInt(partForm.initialStock, 10) : undefined,
        initialLocationId: partForm.initialLocationId || undefined,
      };

      await apiClient('/inventory/parts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsAddPartOpen(false);
      setPartForm({
        partNumber: '',
        name: '',
        description: '',
        category: 'BEARINGS',
        unitOfMeasure: 'PIECE',
        unitPrice: '',
        costPrice: '',
        minStockAlert: '5',
        compatibleModels: '',
        initialStock: '10',
        initialLocationId: locations[0]?.id || '',
      });
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while creating spare part');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Adjust Stock submit
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      const payload = {
        partId: adjustForm.partId,
        locationId: adjustForm.locationId,
        transactionType: adjustForm.transactionType,
        quantityDelta: parseInt(adjustForm.quantityDelta, 10),
        unitCost: adjustForm.unitCost ? parseFloat(adjustForm.unitCost) : undefined,
        notes: adjustForm.notes.trim() || undefined,
      };

      await apiClient('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsAdjustStockOpen(false);
      setAdjustForm({
        partId: '',
        locationId: '',
        transactionType: 'PURCHASE_RECEIPT',
        quantityDelta: '',
        unitCost: '',
        notes: '',
      });
      setSelectedPartForAdjust(null);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while adjusting stock');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Add Location submit
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      const payload = {
        name: locationForm.name.trim(),
        code: locationForm.code.trim().toUpperCase(),
        type: locationForm.type.toUpperCase(),
        address: locationForm.address.trim() || undefined,
      };

      await apiClient('/inventory/locations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsAddLocationOpen(false);
      setLocationForm({ name: '', code: '', type: 'SERVICE_VAN', address: '' });
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while creating storage location');
    } finally {
      setFormSubmitting(false);
    }
  };

  const openAdjustModalForPart = (part: SparePart) => {
    setSelectedPartForAdjust(part);
    setAdjustForm({
      partId: part.id,
      locationId: locations[0]?.id || '',
      transactionType: 'PURCHASE_RECEIPT',
      quantityDelta: '10',
      unitCost: String(part.costPrice || part.unitPrice),
      notes: 'Restock batch',
    });
    setIsAdjustStockOpen(true);
  };

  const openTransferModalForPart = (part: SparePart) => {
    setSelectedPartForTransfer(part);
    const locWithStock = part.inventory?.find((inv) => inv.quantityOnHand > 0);
    const originLocId = locWithStock ? locWithStock.locationId : (locations[0]?.id || '');
    const destLoc = locations.find((l) => l.id !== originLocId);
    const destLocId = destLoc ? destLoc.id : (locations[1]?.id || locations[0]?.id || '');

    setTransferForm({
      partId: part.id,
      fromLocationId: originLocId,
      toLocationId: destLocId,
      quantity: '1',
      notes: 'Van replenishment',
    });
    setFormError(null);
    setIsTransferStockOpen(true);
  };

  // Handle Transfer Stock submit
  const handleTransferStock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (transferForm.fromLocationId === transferForm.toLocationId) {
      setFormError('Source and destination locations must be different');
      return;
    }

    const qty = parseInt(transferForm.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setFormError('Quantity must be a positive number');
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        partId: transferForm.partId,
        fromLocationId: transferForm.fromLocationId,
        toLocationId: transferForm.toLocationId,
        quantity: qty,
        notes: transferForm.notes.trim() || undefined,
      };

      await apiClient('/inventory/transfer', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsTransferStockOpen(false);
      setTransferForm({
        partId: '',
        fromLocationId: '',
        toLocationId: '',
        quantity: '1',
        notes: '',
      });
      setSelectedPartForTransfer(null);
      await fetchData();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while transferring stock');
    } finally {
      setFormSubmitting(false);
    }
  };

  const activeTransferPart = parts.find((p) => p.id === transferForm.partId) || selectedPartForTransfer;
  const fromInv = activeTransferPart?.inventory?.find((i) => i.locationId === transferForm.fromLocationId);
  const toInv = activeTransferPart?.inventory?.find((i) => i.locationId === transferForm.toLocationId);
  const availableAtOrigin = fromInv?.quantityOnHand || 0;
  const currentAtDest = toInv?.quantityOnHand || 0;
  const transferQtyNum = parseInt(transferForm.quantity, 10) || 0;
  const isTransferInsufficient = transferQtyNum > availableAtOrigin;
  const isTransferSameLocation = !!(
    transferForm.fromLocationId &&
    transferForm.toLocationId &&
    transferForm.fromLocationId === transferForm.toLocationId
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Spare Parts Catalog & Multi-Location Inventory
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage replacement machinery parts, monitor live stock across warehouses & vans, and track consumption costs.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          <Button
            onClick={() => {
              const defaultPart = parts[0];
              setSelectedPartForTransfer(defaultPart || null);
              const locWithStock = defaultPart?.inventory?.find((inv) => inv.quantityOnHand > 0);
              const originLocId = locWithStock ? locWithStock.locationId : (locations[0]?.id || '');
              const destLoc = locations.find((l) => l.id !== originLocId);
              const destLocId = destLoc ? destLoc.id : (locations[1]?.id || locations[0]?.id || '');

              setTransferForm({
                partId: defaultPart?.id || '',
                fromLocationId: originLocId,
                toLocationId: destLocId,
                quantity: '1',
                notes: '',
              });
              setFormError(null);
              setIsTransferStockOpen(true);
            }}
            variant="outline"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border-blue-200 hover:bg-blue-50 text-blue-700 bg-blue-50/50"
          >
            <ArrowRightLeft className="w-4 h-4 text-blue-600" />
            Transfer Stock
          </Button>
          <Button
            onClick={() => {
              setSelectedPartForAdjust(null);
              setAdjustForm({
                partId: parts[0]?.id || '',
                locationId: locations[0]?.id || '',
                transactionType: 'PURCHASE_RECEIPT',
                quantityDelta: '5',
                unitCost: '',
                notes: '',
              });
              setIsAdjustStockOpen(true);
            }}
            variant="outline"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border-slate-300 hover:bg-slate-50 text-slate-700"
          >
            <ArrowUpDown className="w-4 h-4 text-slate-500" />
            Adjust Stock
          </Button>
          <Button
            onClick={() => setIsAddPartOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Spare Part
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total SKUs</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">{summary.totalSkus}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Catalog replacement parts</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Units on Hand</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">{summary.totalUnitsOnHand}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Across {summary.storageLocationsCount} locations</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inventory Valuation</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                ₹{summary.totalValuation.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Total stock capital</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Alerts</p>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="text-2xl font-bold text-slate-900 font-mono">{summary.lowStockCount}</h3>
                {summary.lowStockCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Needs Restock
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Below reorder threshold</p>
            </div>
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${summary.lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'catalog'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          Parts Catalog ({parts.length})
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'locations'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          Warehouses & Vans ({locations.length})
        </button>
      </div>

      {/* Tab 1: Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU or part name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-500 font-medium">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 focus:outline-none font-medium"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setLowStockFilter(!lowStockFilter)}
                className={`text-xs px-2.5 py-1 rounded-md border font-medium flex items-center gap-1.5 transition-colors ${
                  lowStockFilter
                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Low Stock Only
              </button>
            </div>
          </div>

          {/* Parts Table */}
          <Card className="border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Part SKU</th>
                    <th className="py-3 px-4">Name & Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Total Stock</th>
                    <th className="py-3 px-4">Stock Breakdown</th>
                    <th className="py-3 px-4">Unit Price</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Loading spare parts catalog...
                      </td>
                    </tr>
                  ) : filteredParts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No spare parts found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredParts.map((part) => (
                      <tr key={part.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded text-[11px]">
                            {part.partNumber}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{part.name}</div>
                          {part.description && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {part.description}
                            </div>
                          )}
                          {part.compatibleModels.length > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Fits: {part.compatibleModels.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                            {part.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono text-sm text-slate-900">
                              {part.totalStock} {part.unitOfMeasure}s
                            </span>
                            {part.isLowStock && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                Low
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">Min: {part.minStockAlert}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {part.inventory && part.inventory.length > 0 ? (
                              part.inventory.map((inv) => (
                                <span
                                  key={inv.id}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {inv.location?.code || 'LOC'}: {inv.quantityOnHand}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No stock records</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900">
                            ₹{part.unitPrice.toLocaleString('en-IN')}
                          </div>
                          {part.costPrice && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Cost: ₹{part.costPrice.toLocaleString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => openTransferModalForPart(part)}
                              variant="outline"
                              className="text-[11px] font-semibold px-2 py-1 h-7 border-blue-200 hover:bg-blue-50 hover:text-blue-700 text-blue-600 flex items-center gap-1"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              Transfer
                            </Button>
                            <Button
                              onClick={() => openAdjustModalForPart(part)}
                              variant="outline"
                              className="text-[11px] font-semibold px-2.5 py-1 h-7 border-slate-200 hover:bg-slate-50 hover:text-slate-700 text-slate-600"
                            >
                              Adjust
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Storage Locations */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 font-medium">
              Physical warehouses, regional hubs, and field technician service vans.
            </p>
            <Button
              onClick={() => setIsAddLocationOpen(true)}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Location
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <Card key={loc.id} className="border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
                <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                      {loc.type === 'SERVICE_VAN' ? (
                        <Truck className="w-4 h-4" />
                      ) : (
                        <Warehouse className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{loc.name}</h4>
                      <span className="font-mono text-[10px] text-blue-600 font-semibold">{loc.code}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                    {loc.type}
                  </span>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {loc.address && (
                    <p className="text-xs text-slate-500 line-clamp-2">{loc.address}</p>
                  )}
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Items</span>
                      <p className="font-mono font-bold text-slate-800">{loc.totalItems} SKUs</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Stock Units</span>
                      <p className="font-mono font-bold text-blue-600">{loc.totalUnits} units</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Spare Part */}
      <Dialog isOpen={isAddPartOpen} onClose={() => setIsAddPartOpen(false)} title="Register New Spare Part">
        <form onSubmit={handleAddPart} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Part Number (SKU) *</label>
              <Input
                required
                placeholder="e.g. SP-BRG-6204"
                value={partForm.partNumber}
                onChange={(e) => setPartForm({ ...partForm, partNumber: e.target.value })}
                className="mt-1 text-xs uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Category *</label>
              <Input
                required
                placeholder="e.g. BEARINGS, SEALS, MOTORS"
                value={partForm.category}
                onChange={(e) => setPartForm({ ...partForm, category: e.target.value })}
                className="mt-1 text-xs uppercase"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Part Name *</label>
            <Input
              required
              placeholder="e.g. Deep Groove Ball Bearing 6204-2RS"
              value={partForm.name}
              onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
              className="mt-1 text-xs font-medium"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Description / Specifications</label>
            <textarea
              placeholder="Precision tolerance Class P5, nitrile seals, synthetic grease..."
              value={partForm.description}
              onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
              className="mt-1 w-full text-xs rounded-md border border-slate-300 p-2 focus:outline-none focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Unit Price (₹) *</label>
              <Input
                required
                type="number"
                step="0.01"
                min="0"
                placeholder="1250"
                value={partForm.unitPrice}
                onChange={(e) => setPartForm({ ...partForm, unitPrice: e.target.value })}
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Cost Price (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="850"
                value={partForm.costPrice}
                onChange={(e) => setPartForm({ ...partForm, costPrice: e.target.value })}
                className="mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Min Stock Alert</label>
              <Input
                type="number"
                min="0"
                value={partForm.minStockAlert}
                onChange={(e) => setPartForm({ ...partForm, minStockAlert: e.target.value })}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Compatible Models (comma-separated)</label>
            <Input
              placeholder="e.g. VMC-850, CNC-LATHE-200, DRILL-PRESS-40"
              value={partForm.compatibleModels}
              onChange={(e) => setPartForm({ ...partForm, compatibleModels: e.target.value })}
              className="mt-1 text-xs"
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <h5 className="text-xs font-bold text-slate-700 mb-2">Initial Stock Setup (Optional)</h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Initial Units</label>
                <Input
                  type="number"
                  min="0"
                  value={partForm.initialStock}
                  onChange={(e) => setPartForm({ ...partForm, initialStock: e.target.value })}
                  className="mt-1 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Deposit Location</label>
                <select
                  value={partForm.initialLocationId}
                  onChange={(e) => setPartForm({ ...partForm, initialLocationId: e.target.value })}
                  className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-700 focus:outline-none"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddPartOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
            >
              {formSubmitting ? 'Saving...' : 'Register Part'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Adjust Stock / Restock */}
      <Dialog
        isOpen={isAdjustStockOpen}
        onClose={() => setIsAdjustStockOpen(false)}
        title={selectedPartForAdjust ? `Adjust Stock: ${selectedPartForAdjust.partNumber}` : 'Adjust Inventory Stock'}
      >
        <form onSubmit={handleAdjustStock} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {formError}
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Spare Part *</label>
            <select
              required
              value={adjustForm.partId}
              onChange={(e) => setAdjustForm({ ...adjustForm, partId: e.target.value })}
              className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-700 focus:outline-none font-medium"
            >
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.partNumber} - {p.name} (Current Stock: {p.totalStock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Storage Location *</label>
              <select
                required
                value={adjustForm.locationId}
                onChange={(e) => setAdjustForm({ ...adjustForm, locationId: e.target.value })}
                className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-700 focus:outline-none font-medium"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Movement Type *</label>
              <select
                required
                value={adjustForm.transactionType}
                onChange={(e) => setAdjustForm({ ...adjustForm, transactionType: e.target.value })}
                className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-700 focus:outline-none font-medium"
              >
                <option value="PURCHASE_RECEIPT">Purchase Receipt (+ Stock)</option>
                <option value="MANUAL_ADJUSTMENT">Manual Adjustment (+ / -)</option>
                <option value="RETURN">Customer Return (+ Stock)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Quantity Delta (+ or -) *</label>
              <Input
                required
                type="number"
                placeholder="e.g. 10 or -2"
                value={adjustForm.quantityDelta}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantityDelta: e.target.value })}
                className="mt-1 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Unit Cost (₹)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Defaults to catalog cost"
                value={adjustForm.unitCost}
                onChange={(e) => setAdjustForm({ ...adjustForm, unitCost: e.target.value })}
                className="mt-1 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Reason / Audit Notes</label>
            <textarea
              placeholder="Vendor PO #1234, quarterly inventory cycle audit, etc."
              value={adjustForm.notes}
              onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
              className="mt-1 w-full text-xs rounded-md border border-slate-300 p-2 focus:outline-none focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAdjustStockOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
            >
              {formSubmitting ? 'Applying...' : 'Apply Stock Change'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Transfer Stock Between Locations */}
      <Dialog
        isOpen={isTransferStockOpen}
        onClose={() => setIsTransferStockOpen(false)}
        title={
          selectedPartForTransfer
            ? `Transfer Stock: ${selectedPartForTransfer.partNumber} (${selectedPartForTransfer.name})`
            : 'Inter-Location Stock Transfer'
        }
      >
        <form onSubmit={handleTransferStock} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {formError}
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Spare Part *</label>
            <select
              required
              value={transferForm.partId}
              onChange={(e) => {
                const p = parts.find((part) => part.id === e.target.value);
                setSelectedPartForTransfer(p || null);
                const locWithStock = p?.inventory?.find((inv) => inv.quantityOnHand > 0);
                const fromId = locWithStock ? locWithStock.locationId : (locations[0]?.id || '');
                const destLoc = locations.find((l) => l.id !== fromId);
                const toId = destLoc ? destLoc.id : (locations[1]?.id || locations[0]?.id || '');

                setTransferForm({
                  ...transferForm,
                  partId: e.target.value,
                  fromLocationId: fromId,
                  toLocationId: toId,
                });
              }}
              className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-700 focus:outline-none font-medium"
            >
              {parts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.partNumber} - {p.name} (Total Stock: {p.totalStock})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Source Location (From) *</label>
              <select
                required
                value={transferForm.fromLocationId}
                onChange={(e) => setTransferForm({ ...transferForm, fromLocationId: e.target.value })}
                className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-700 focus:outline-none font-medium"
              >
                {locations.map((loc) => {
                  const inv = activeTransferPart?.inventory?.find((i) => i.locationId === loc.id);
                  const units = inv ? inv.quantityOnHand : 0;
                  return (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code}) - {units} on hand
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Destination Location (To) *</label>
              <select
                required
                value={transferForm.toLocationId}
                onChange={(e) => setTransferForm({ ...transferForm, toLocationId: e.target.value })}
                className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-700 focus:outline-none font-medium"
              >
                {locations.map((loc) => {
                  const inv = activeTransferPart?.inventory?.find((i) => i.locationId === loc.id);
                  const units = inv ? inv.quantityOnHand : 0;
                  return (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code}) - {units} on hand
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Live Transfer Preview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase">
              <span>Transfer Preview</span>
              <span className="font-mono text-slate-700">Moving {transferQtyNum} unit(s)</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs bg-white p-2.5 rounded border border-slate-200">
              <div className="flex-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Origin</span>
                <p className="font-bold text-slate-800 truncate">
                  {locations.find((l) => l.id === transferForm.fromLocationId)?.code || 'Origin'}
                </p>
                <div className="flex items-center gap-1 mt-0.5 font-mono text-[11px]">
                  <span className="text-slate-500">{availableAtOrigin}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className={isTransferInsufficient ? 'text-red-600 font-bold' : 'text-slate-900 font-bold'}>
                    {availableAtOrigin - transferQtyNum}
                  </span>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-4 h-4" />
              </div>

              <div className="flex-1 text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Destination</span>
                <p className="font-bold text-slate-800 truncate">
                  {locations.find((l) => l.id === transferForm.toLocationId)?.code || 'Destination'}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5 font-mono text-[11px]">
                  <span className="text-slate-500">{currentAtDest}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-emerald-600 font-bold">
                    {currentAtDest + transferQtyNum}
                  </span>
                </div>
              </div>
            </div>

            {isTransferSameLocation && (
              <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-200 font-medium">
                Origin and Destination cannot be the same location.
              </div>
            )}
            {isTransferInsufficient && (
              <div className="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-200 font-medium">
                Insufficient stock! Origin only has {availableAtOrigin} units available.
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-600 uppercase">Transfer Quantity *</label>
              {availableAtOrigin > 0 && (
                <button
                  type="button"
                  onClick={() => setTransferForm({ ...transferForm, quantity: String(availableAtOrigin) })}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-bold"
                >
                  Max Available ({availableAtOrigin})
                </button>
              )}
            </div>
            <Input
              required
              type="number"
              min="1"
              max={availableAtOrigin > 0 ? availableAtOrigin : undefined}
              placeholder="e.g. 5"
              value={transferForm.quantity}
              onChange={(e) => setTransferForm({ ...transferForm, quantity: e.target.value })}
              className="mt-1 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Transfer / Dispatch Notes</label>
            <textarea
              placeholder="e.g. Service Van replenishment for Ticket #TK-1002, dispatched via driver Alex."
              value={transferForm.notes}
              onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
              className="mt-1 w-full text-xs rounded-md border border-slate-300 p-2 focus:outline-none focus:border-blue-500"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTransferStockOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                formSubmitting ||
                isTransferSameLocation ||
                isTransferInsufficient ||
                transferQtyNum <= 0
              }
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              {formSubmitting ? 'Transferring...' : 'Execute Transfer'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Add Storage Location */}
      <Dialog isOpen={isAddLocationOpen} onClose={() => setIsAddLocationOpen(false)} title="Register Storage Location">
        <form onSubmit={handleAddLocation} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
              {formError}
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Location Name *</label>
            <Input
              required
              placeholder="e.g. Service Van MH-12-AB-5678"
              value={locationForm.name}
              onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
              className="mt-1 text-xs font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Location Code *</label>
              <Input
                required
                placeholder="e.g. VAN-02"
                value={locationForm.code}
                onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                className="mt-1 text-xs uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase">Type *</label>
              <select
                value={locationForm.type}
                onChange={(e) => setLocationForm({ ...locationForm, type: e.target.value })}
                className="mt-1 w-full text-xs bg-white border border-slate-300 rounded-md p-2 text-slate-700 focus:outline-none"
              >
                <option value="SERVICE_VAN">Service Van (Mobile)</option>
                <option value="WAREHOUSE">Warehouse (Central)</option>
                <option value="DEPOT">Regional Depot</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase">Physical Address or Vehicle Assigned</label>
            <Input
              placeholder="e.g. Assigned to Field Technician John Doe"
              value={locationForm.address}
              onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
              className="mt-1 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddLocationOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={formSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
            >
              {formSubmitting ? 'Saving...' : 'Register Location'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
