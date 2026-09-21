'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Box,
  Plus,
  Search,
  Calendar,
  Building,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
} from '@/components/ui';

interface Product {
  id: string;
  name: string;
  modelNumber: string;
  category: string;
  departmentId?: string;
  departmentName?: string;
  hasWarranty: boolean;
  warrantyPeriodMonths: number;
  assetCount: number;
  createdAt: string;
}

interface CustomerAsset {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  modelNumber: string;
  serialNumber: string;
  installationDate?: string;
  warrantyEndDate?: string;
  location?: string;
  status: string;
  createdAt: string;
}

interface CustomerOption {
  id: string;
  companyName: string;
}

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'assets'>('catalog');
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<CustomerAsset[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assetSearch, setAssetSearch] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product Form State
  const [prodName, setProdName] = useState('');
  const [prodModel, setProdModel] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodWarrantyMonths, setProdWarrantyMonths] = useState(12);

  // Asset Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [assetSerial, setAssetSerial] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [assetInstallDate, setAssetInstallDate] = useState('');
  const [assetWarrantyDate, setAssetWarrantyDate] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [prodsData, assetsData, custsData] = await Promise.all([
        apiClient<Product[]>('/products'),
        apiClient<CustomerAsset[]>(`/assets${assetSearch ? `?search=${encodeURIComponent(assetSearch)}` : ''}`),
        apiClient<CustomerOption[]>('/customers'),
      ]);
      setProducts(prodsData);
      setAssets(assetsData);
      setCustomers(custsData);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to fetch catalog' });
    } finally {
      setIsLoading(false);
    }
  }, [assetSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodModel.trim() || !prodCategory.trim()) return;

    try {
      setIsSubmitting(true);
      await apiClient('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: prodName.trim(),
          modelNumber: prodModel.trim(),
          category: prodCategory.trim(),
          warrantyPeriodMonths: Number(prodWarrantyMonths) || 12,
        }),
      });

      setFeedbackMsg({ type: 'success', text: `Product model "${prodName}" added to catalog` });
      setIsProductModalOpen(false);
      setProdName('');
      setProdModel('');
      setProdCategory('');
      await fetchData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add product' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedProductId || !assetSerial.trim()) return;

    try {
      setIsSubmitting(true);
      await apiClient('/assets', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomerId,
          productId: selectedProductId,
          serialNumber: assetSerial.trim(),
          location: assetLocation.trim() || undefined,
          installationDate: assetInstallDate || undefined,
          warrantyEndDate: assetWarrantyDate || undefined,
        }),
      });

      setFeedbackMsg({ type: 'success', text: `Equipment "${assetSerial}" registered successfully` });
      setIsAssetModalOpen(false);
      setAssetSerial('');
      setAssetLocation('');
      setAssetInstallDate('');
      setAssetWarrantyDate('');
      await fetchData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to register equipment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove product "${name}" from catalog?`)) return;
    try {
      await apiClient(`/products/${id}`, { method: 'DELETE' });
      setFeedbackMsg({ type: 'success', text: `Product "${name}" deleted` });
      await fetchData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete product' });
    }
  };

  const handleDeleteAsset = async (id: string, serial: string) => {
    if (!confirm(`Are you sure you want to delete equipment "${serial}"?`)) return;
    try {
      await apiClient(`/assets/${id}`, { method: 'DELETE' });
      setFeedbackMsg({ type: 'success', text: `Asset "${serial}" removed` });
      await fetchData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete asset' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products & Installed Equipment</h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain your master hardware catalog and track serialized customer equipment for service calls.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === 'catalog' ? (
            <Button
              onClick={() => {
                setFeedbackMsg(null);
                setIsProductModalOpen(true);
              }}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product Model</span>
            </Button>
          ) : (
            <Button
              onClick={() => {
                setFeedbackMsg(null);
                if (products[0]) setSelectedProductId(products[0].id);
                if (customers[0]) setSelectedCustomerId(customers[0].id);
                setIsAssetModalOpen(true);
              }}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Register Equipment</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Product Catalog ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assets')}
          className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 ${
            activeTab === 'assets'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Customer Machines ({assets.length})</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in-50 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* TAB 1: PRODUCT CATALOG */}
      {activeTab === 'catalog' && (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-6 bg-white rounded-xl border border-slate-200 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <Box className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No products in catalog</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Add equipment and hardware models to link customer warranty terms and service calls.
              </p>
              <Button onClick={() => setIsProductModalOpen(true)} size="sm" className="mt-2">
                Add First Product Model
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((prod) => (
                <Card key={prod.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold text-slate-900">{prod.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold border border-slate-200">
                          {prod.modelNumber}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-medium">{prod.category}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteProduct(prod.id, prod.name)}
                      title="Delete Product"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0 text-xs">
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Warranty Coverage:</span>
                        <span className="font-semibold text-slate-800">
                          {prod.warrantyPeriodMonths} Months
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Customer Installations:</span>
                        <span className="font-semibold text-blue-600">{prod.assetCount} Machines</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER INSTALLED ASSETS */}
      {activeTab === 'assets' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
              placeholder="Search by serial number, machine model, customer..."
              className="w-full pl-9 pr-4 py-2 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-white rounded-xl border border-slate-200">
                  <Skeleton className="h-6 w-full" />
                </div>
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <Layers className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No equipment registered</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Register customer-installed machines with serial numbers to track warranty and dispatch technicians.
              </p>
              <Button onClick={() => setIsAssetModalOpen(true)} size="sm" className="mt-2">
                Register First Equipment
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Serial Number</th>
                      <th className="py-3 px-4">Product Model</th>
                      <th className="py-3 px-4">Customer Account</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Warranty End Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assets.map((a) => {
                      const isExpired = a.warrantyEndDate ? new Date(a.warrantyEndDate) < new Date() : false;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {a.serialNumber}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{a.productName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{a.modelNumber}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800 flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{a.customerName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {a.location || 'Site Plant'}
                          </td>
                          <td className="py-3.5 px-4">
                            {a.warrantyEndDate ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                  isExpired
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {new Date(a.warrantyEndDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px] font-medium">
                              {a.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteAsset(a.id, a.serialNumber)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      <Dialog
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Add Product Model to Catalog"
        description="Define a standard machinery or hardware model with warranty guidelines."
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 mt-4">
          <Input
            id="prod-name"
            label="Product Name"
            required
            value={prodName}
            onChange={(e) => setProdName(e.target.value)}
            placeholder="e.g. CNC 5-Axis Heavy Machining Center"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="prod-model"
              label="Model Number"
              required
              value={prodModel}
              onChange={(e) => setProdModel(e.target.value.toUpperCase())}
              placeholder="e.g. CNC-5000"
            />
            <Input
              id="prod-cat"
              label="Category"
              required
              value={prodCategory}
              onChange={(e) => setProdCategory(e.target.value)}
              placeholder="e.g. CNC Milling"
            />
          </div>

          <Input
            id="prod-warranty"
            type="number"
            label="Warranty Period (Months)"
            required
            value={prodWarrantyMonths}
            onChange={(e) => setProdWarrantyMonths(Number(e.target.value))}
            min={0}
            max={120}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProductModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              Save Product
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Register Customer Asset Modal */}
      <Dialog
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        title="Register Customer Equipment"
        description="Link a serialized machine unit to a customer company site for warranty tracking."
      >
        <form onSubmit={handleCreateAsset} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Customer Account
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Product Model
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.modelNumber})
                </option>
              ))}
            </select>
          </div>

          <Input
            id="asset-serial"
            label="Machine Serial Number"
            required
            value={assetSerial}
            onChange={(e) => setAssetSerial(e.target.value.toUpperCase())}
            placeholder="e.g. SN-TATA-2026-001"
            helperText="Unique physical barcode / identification plate number"
          />

          <Input
            id="asset-location"
            label="Installed Location / Plant Bay"
            value={assetLocation}
            onChange={(e) => setAssetLocation(e.target.value)}
            placeholder="e.g. Pune Plant 1 - Engine Bay 3"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="asset-install"
              type="date"
              label="Installation Date"
              value={assetInstallDate}
              onChange={(e) => setAssetInstallDate(e.target.value)}
            />
            <Input
              id="asset-warranty"
              type="date"
              label="Warranty Expiration Date"
              value={assetWarrantyDate}
              onChange={(e) => setAssetWarrantyDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssetModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              Register Machine
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
