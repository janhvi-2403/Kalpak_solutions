'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui';
import { X, Calendar, Wrench, User, FileText, Loader2 } from 'lucide-react';

interface Employee {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  departmentName?: string;
}

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: string;
  employees: Employee[];
  defaultTechnicianId?: string;
  onCreated: () => void;
}

const SERVICE_TYPES = [
  { value: 'ON_SITE_REPAIR', label: 'On-Site Machine Repair' },
  { value: 'PREVENTIVE_MAINTENANCE', label: 'Preventive Maintenance (PM)' },
  { value: 'CALIBRATION', label: 'Precision Calibration & Testing' },
  { value: 'INSTALLATION', label: 'Equipment Installation & Commissioning' },
  { value: 'DIAGNOSTIC', label: 'Root Cause Diagnostics & Audit' },
];

export function WorkOrderModal({
  isOpen,
  onClose,
  ticketId,
  ticketNumber,
  employees,
  defaultTechnicianId,
  onCreated,
}: WorkOrderModalProps) {
  const [assignedTechnicianId, setAssignedTechnicianId] = useState(
    defaultTechnicianId || employees[0]?.userId || '',
  );
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0],
  );
  const [serviceType, setServiceType] = useState('ON_SITE_REPAIR');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient('/work-orders', {
        method: 'POST',
        body: JSON.stringify({
          ticketId,
          assignedTechnicianId,
          scheduledDate: new Date(scheduledDate || Date.now()).toISOString(),
          serviceType,
          technicianNotes: technicianNotes || undefined,
        }),
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch work order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Schedule Field Work Order</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dispatch engineer & inspection checklist for <strong className="text-slate-700">{ticketNumber}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Assigned Technician */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Assigned Field Engineer / Technician *</span>
            </label>
            <select
              required
              value={assignedTechnicianId}
              onChange={(e) => setAssignedTechnicianId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {employees.map((emp) => (
                <option key={emp.userId} value={emp.userId}>
                  {emp.fullName} ({emp.role}) {emp.departmentName ? `• ${emp.departmentName}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Service Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-slate-500" />
              <span>Service Type / Nature of Visit *</span>
            </label>
            <select
              required
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              {SERVICE_TYPES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Scheduled On-Site Date *</span>
            </label>
            <input
              type="date"
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Instructions / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Technician Instructions / Scope Notes</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Bring replacement spindle bearings and vibration analyzer. Check zero energy LOTO before starting."
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !assignedTechnicianId}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <span>Dispatch Work Order</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
