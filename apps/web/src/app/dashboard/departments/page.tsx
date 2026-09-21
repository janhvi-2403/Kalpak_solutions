'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import {
  Plus,
  Users,
  Box,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Building2,
  UserCheck,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
} from '@/components/ui';

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  headUser?: { id: string; fullName: string; email: string };
  memberCount: number;
  productCount: number;
  createdAt: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  const fetchDepartments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient<Department[]>('/departments');
      setDepartments(data);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to fetch departments' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    try {
      setIsSubmitting(true);
      setFeedbackMsg(null);
      await apiClient('/departments', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
        }),
      });

      setFeedbackMsg({ type: 'success', text: `Department "${name}" created successfully` });
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      await fetchDepartments();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create department' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, deptName: string) => {
    if (!confirm(`Are you sure you want to delete department "${deptName}"?`)) return;

    try {
      await apiClient(`/departments/${id}`, { method: 'DELETE' });
      setFeedbackMsg({ type: 'success', text: `Department "${deptName}" deleted` });
      await fetchDepartments();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete department' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Service Departments</h1>
            <Badge variant="primary" className="font-mono text-xs">
              {departments.length} Active
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Organize technicians, products, and routing rules for automated ticket allocation.
          </p>
        </div>

        <Button
          onClick={() => {
            setFeedbackMsg(null);
            setIsModalOpen(true);
          }}
          className="gap-2 self-start sm:self-auto bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </Button>
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

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 bg-white rounded-xl border border-slate-200 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No departments configured</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create departments such as Electrical, Mechanical, or IT Support to route service tickets efficiently.
          </p>
          <Button onClick={() => setIsModalOpen(true)} size="sm" className="mt-2">
            Create First Department
          </Button>
        </div>
      ) : (
        /* Departments Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <Card key={dept.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold text-slate-900">{dept.name}</CardTitle>
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold border border-slate-200">
                      {dept.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {dept.description || 'No description provided.'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(dept.id, dept.name)}
                  title="Delete Department"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {/* Head of Department */}
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="truncate">
                    <span className="text-slate-400">Head: </span>
                    <span className="font-medium text-slate-800">
                      {dept.headUser ? dept.headUser.fullName : 'Unassigned'}
                    </span>
                  </div>
                </div>

                {/* Metrics Badges */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dept.memberCount} Staff</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Box className="w-3.5 h-3.5 text-slate-400" />
                    <span>{dept.productCount} Products</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Department Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Service Department"
        description="Add a technical department to group technicians, products, and routing rules."
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-4">
          <Input
            id="dept-name"
            label="Department Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Field Electrical Maintenance"
          />

          <Input
            id="dept-code"
            label="Department Code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. ELEC"
            helperText="Short uppercase alphanumeric code used in ticket identifiers"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Scope of work and responsibilities..."
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              Create Department
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
