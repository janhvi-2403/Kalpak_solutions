'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { WorkOrderModal } from './work-order-modal';
import { CustomerSignoffModal } from './customer-signoff-modal';
import { Button } from '@/components/ui';
import {
  Wrench,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  MinusCircle,
  Star,
  CheckCheck,
  User,
  Calendar,
  FileCheck2,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  itemCode: string;
  taskTitle: string;
  description?: string | null;
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'NOT_APPLICABLE';
  readingValue?: string | null;
  targetValue?: string | null;
  remarks?: string | null;
  sortOrder: number;
}

interface WorkOrder {
  id: string;
  orderNumber: string;
  ticketId: string;
  status: 'SCHEDULED' | 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  serviceType: string;
  scheduledDate: string;
  workStartedAt?: string | null;
  workCompletedAt?: string | null;
  technicianNotes?: string | null;
  customerSignerName?: string | null;
  customerSignerTitle?: string | null;
  customerSignature?: string | null;
  customerRating?: number | null;
  customerFeedback?: string | null;
  isSigned: boolean;
  signedAt?: string | null;
  assignedTechnician?: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber?: string | null;
  };
  customer?: {
    id: string;
    companyName: string;
    contactPerson: string;
  };
  checklistItems?: ChecklistItem[];
}

interface Employee {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  departmentName?: string;
}

interface WorkOrdersSectionProps {
  ticketId: string;
  ticketNumber: string;
  ticketStatus: string;
  employees: Employee[];
  customerCompanyName?: string;
  customerContactPerson?: string;
  defaultTechnicianId?: string;
  onRefreshTicket: () => void;
}

export function WorkOrdersSection({
  ticketId,
  ticketNumber,
  ticketStatus,
  employees,
  customerCompanyName,
  customerContactPerson,
  defaultTechnicianId,
  onRefreshTicket,
}: WorkOrdersSectionProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeSignoffOrder, setActiveSignoffOrder] = useState<WorkOrder | null>(null);
  const [editingReadings, setEditingReadings] = useState<Record<string, string>>({});
  const [isUpdatingItem, setIsUpdatingItem] = useState<string | null>(null);

  const fetchWorkOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient<{ data: WorkOrder[] } | WorkOrder[]>(
        `/work-orders/by-ticket/${ticketId}`,
      );
      const items = Array.isArray(res) ? res : (res as any)?.data || [];
      setWorkOrders(items);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const handleStartWork = async (workOrderId: string) => {
    try {
      await apiClient(`/work-orders/${workOrderId}/start`, { method: 'PATCH' });
      await fetchWorkOrders();
      onRefreshTicket();
    } catch {
      // Ignore
    }
  };

  const handleToggleChecklistStatus = async (
    workOrderId: string,
    item: ChecklistItem,
  ) => {
    const nextStatus: Record<string, 'PASSED' | 'FAILED' | 'NOT_APPLICABLE' | 'PENDING'> = {
      PENDING: 'PASSED',
      PASSED: 'FAILED',
      FAILED: 'NOT_APPLICABLE',
      NOT_APPLICABLE: 'PENDING',
    };

    const targetStatus = nextStatus[item.status] || 'PASSED';
    setIsUpdatingItem(item.id);

    try {
      const reading = editingReadings[item.id] !== undefined ? editingReadings[item.id] : item.readingValue;
      await apiClient(`/work-orders/${workOrderId}/checklist/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: targetStatus,
          readingValue: reading || undefined,
        }),
      });
      await fetchWorkOrders();
    } catch {
      // Ignore
    } finally {
      setIsUpdatingItem(null);
    }
  };

  const handleSaveReading = async (workOrderId: string, item: ChecklistItem) => {
    const reading = editingReadings[item.id];
    if (reading === undefined) return;

    setIsUpdatingItem(item.id);
    try {
      await apiClient(`/work-orders/${workOrderId}/checklist/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: item.status === 'PENDING' ? 'PASSED' : item.status,
          readingValue: reading,
        }),
      });
      await fetchWorkOrders();
    } catch {
      // Ignore
    } finally {
      setIsUpdatingItem(null);
    }
  };

  const canCreate = !['CLOSED', 'CANCELLED'].includes(ticketStatus);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">Field Service & Work Orders</h3>
              <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {workOrders.length} {workOrders.length === 1 ? 'Visit' : 'Visits'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Service checklists, telemetry readings, and verified customer sign-offs
            </p>
          </div>
        </div>

        {canCreate && (
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Field Visit</span>
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-8 text-center text-xs text-slate-400">Loading work orders...</div>
      ) : workOrders.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-slate-100 rounded-xl text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No field service visits scheduled</p>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            Dispatch an engineer to perform on-site diagnosis, preventive maintenance, or component repairs with verified checklists.
          </p>
          {canCreate && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              variant="outline"
              className="mt-4 gap-1.5 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule First Visit</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {workOrders.map((wo) => {
            const isCompleted = wo.status === 'COMPLETED';
            const isInProgress = wo.status === 'IN_PROGRESS';
            const isScheduled = wo.status === 'SCHEDULED' || wo.status === 'DISPATCHED';

            return (
              <div
                key={wo.id}
                className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
              >
                {/* Work Order Top Bar */}
                <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-xs">
                      {wo.orderNumber}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {wo.serviceType.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isInProgress
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {wo.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {isScheduled && (
                      <Button
                        size="sm"
                        onClick={() => handleStartWork(wo.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Start Field Work</span>
                      </Button>
                    )}

                    {isInProgress && (
                      <Button
                        size="sm"
                        onClick={() => setActiveSignoffOrder(wo)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>Customer Sign-Off & Complete</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Technician & Visit Meta */}
                <div className="p-4 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Field Engineer</span>
                      <span className="font-semibold text-slate-800">
                        {wo.assignedTechnician?.fullName || 'Assigned Engineer'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Scheduled Date</span>
                      <span className="font-semibold text-slate-800">
                        {new Date(wo.scheduledDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Execution Period</span>
                      <span className="font-semibold text-slate-800">
                        {wo.workStartedAt
                          ? `Started ${new Date(wo.workStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Pending start'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Inspection Checklist Table */}
                <div className="p-4 space-y-3 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Field Service Checklist & Sensor Readings
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Click status button to cycle: <strong className="text-emerald-600">PASS</strong> / <strong className="text-red-600">FAIL</strong> / <strong className="text-slate-500">N/A</strong>
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {wo.checklistItems?.map((item) => {
                      const isItemPassed = item.status === 'PASSED';
                      const isItemFailed = item.status === 'FAILED';
                      const isItemNa = item.status === 'NOT_APPLICABLE';

                      return (
                        <div
                          key={item.id}
                          className={`p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                            isItemPassed
                              ? 'bg-emerald-50/20'
                              : isItemFailed
                              ? 'bg-red-50/30'
                              : 'bg-white hover:bg-slate-50/50'
                          }`}
                        >
                          {/* Task Description */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                                {item.itemCode}
                              </span>
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {item.taskTitle}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                            {item.targetValue && (
                              <span className="text-[10px] text-slate-400 font-mono inline-block mt-0.5">
                                Specification: <strong className="text-slate-600">{item.targetValue}</strong>
                              </span>
                            )}
                          </div>

                          {/* Reading & Controls */}
                          <div className="flex items-center gap-2 self-end md:self-center">
                            {/* Measurement Reading Input */}
                            <div className="flex items-center space-x-1">
                              <input
                                type="text"
                                placeholder="Reading / val"
                                disabled={isCompleted}
                                value={
                                  editingReadings[item.id] !== undefined
                                    ? editingReadings[item.id]
                                    : item.readingValue || ''
                                }
                                onChange={(e) =>
                                  setEditingReadings((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                                onBlur={() => handleSaveReading(wo.id, item)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveReading(wo.id, item)}
                                className="w-28 text-xs font-mono p-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>

                            {/* Status Switcher Button */}
                            <button
                              type="button"
                              disabled={isCompleted || isUpdatingItem === item.id}
                              onClick={() => handleToggleChecklistStatus(wo.id, item)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shadow-2xs ${
                                isItemPassed
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : isItemFailed
                                  ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                  : isItemNa
                                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                              }`}
                            >
                              {isItemPassed ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>PASSED</span>
                                </>
                              ) : isItemFailed ? (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-red-600" />
                                  <span>FAILED</span>
                                </>
                              ) : isItemNa ? (
                                <>
                                  <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
                                  <span>N / A</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>PENDING</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Sign-off Summary Card (when completed) */}
                {isCompleted && (
                  <div className="p-4 bg-emerald-50/40 border-t border-emerald-100 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <CheckCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          Customer Verified & Digitally Signed
                        </span>
                      </div>
                      {wo.customerRating && (
                        <div className="flex items-center space-x-1 bg-white px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= wo.customerRating!
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                          <span className="text-xs font-bold text-slate-700 ml-1">
                            {wo.customerRating}/5
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Approved By</span>
                        <div className="font-bold text-slate-900 text-sm">
                          {wo.customerSignerName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {wo.customerSignerTitle} • Signed on {wo.signedAt ? new Date(wo.signedAt).toLocaleDateString() : 'N/A'}
                        </div>
                        {wo.customerFeedback && (
                          <p className="mt-2 text-slate-700 italic bg-white p-2.5 rounded-lg border border-emerald-100">
                            "{wo.customerFeedback}"
                          </p>
                        )}
                      </div>

                      {/* Digital Signature Preview */}
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Digital Signature</span>
                        <div className="mt-1 p-2 bg-white rounded-lg border border-slate-200 inline-block">
                          {wo.customerSignature?.startsWith('data:image') ? (
                            <img
                              src={wo.customerSignature}
                              alt="Customer Signature"
                              className="h-12 object-contain"
                            />
                          ) : (
                            <div className="font-mono text-xs text-emerald-700 font-bold py-2 px-3 bg-emerald-50 rounded">
                              ✓ Digitally Approved: {wo.customerSignerName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <WorkOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        ticketId={ticketId}
        ticketNumber={ticketNumber}
        employees={employees}
        defaultTechnicianId={defaultTechnicianId}
        onCreated={() => {
          fetchWorkOrders();
          onRefreshTicket();
        }}
      />

      {activeSignoffOrder && (
        <CustomerSignoffModal
          isOpen={Boolean(activeSignoffOrder)}
          onClose={() => setActiveSignoffOrder(null)}
          workOrderId={activeSignoffOrder.id}
          orderNumber={activeSignoffOrder.orderNumber}
          customerCompanyName={customerCompanyName}
          defaultContactPerson={customerContactPerson}
          onCompleted={() => {
            fetchWorkOrders();
            onRefreshTicket();
          }}
        />
      )}
    </div>
  );
}
