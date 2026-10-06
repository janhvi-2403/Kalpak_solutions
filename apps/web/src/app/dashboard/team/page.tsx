'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import {
  Wrench,
  Mail,
  Phone,
  Layers,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
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
  Checkbox,
} from '@/components/ui';

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface Employee {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  designation?: string | null;
  skills: string[];
  isAvailable: boolean;
  activeTicketsCount: number;
}

export default function TeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Modal State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [departmentId, setDepartmentId] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [skillsString, setSkillsString] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [empsData, deptsData] = await Promise.all([
        apiClient<Employee[]>('/employees'),
        apiClient<DepartmentOption[]>('/departments'),
      ]);
      setEmployees(empsData);
      setDepartments(deptsData);
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to load team roster' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setDepartmentId(emp.departmentId || '');
    setDesignation(emp.designation || '');
    setPhone(emp.phone || '');
    setSkillsString(emp.skills ? emp.skills.join(', ') : '');
    setIsAvailable(emp.isAvailable ?? true);
    setIsModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      setIsSubmitting(true);
      const parsedSkills = skillsString
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await apiClient(`/employees/${editingEmployee.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          departmentId: departmentId || null,
          designation: designation.trim() || undefined,
          phone: phone.trim() || undefined,
          skills: parsedSkills,
          isAvailable,
        }),
      });

      setFeedbackMsg({ type: 'success', text: `Profile updated for ${editingEmployee.fullName}` });
      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team & Technicians Roster</h1>
            <Badge variant="primary" className="font-mono text-xs">
              {employees.length} Members
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage field service engineers, skill competencies, and department assignments for automated ticket dispatch.
          </p>
        </div>

        <Link href="/dashboard/admins">
          <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 shrink-0 shadow-xs">
            <ShieldCheck className="w-4 h-4 mr-2 text-orange-600" />
            <span>Manage Client Admins</span>
          </Button>
        </Link>
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
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : (
        /* Team Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map((emp) => (
            <Card key={emp.userId} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {emp.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 leading-tight">
                      {emp.fullName}
                    </CardTitle>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {emp.designation || 'Staff Member'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openEditModal(emp)}
                  title="Edit Profile"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </CardHeader>

              <CardContent className="space-y-3 pt-0 text-xs">
                {/* Role & Department */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold border border-slate-200">
                    {emp.role}
                  </span>

                  {emp.departmentName ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200/80">
                      <Layers className="w-3 h-3 text-blue-600" />
                      {emp.departmentName}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">No Dept Assigned</span>
                  )}
                </div>

                {/* Contact info */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-600">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {emp.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{emp.phone}</span>
                    </div>
                  )}
                </div>

                {/* Skills Section */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-slate-400" />
                    <span>Skill Competencies:</span>
                  </div>
                  {emp.skills && emp.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {emp.skills.map((skill) => (
                        <span
                          key={skill}
                          className="bg-indigo-50 text-indigo-700 border border-indigo-200/70 text-[10px] font-medium px-2 py-0.5 rounded-md"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[11px]">No skill tags registered</div>
                  )}
                </div>

                {/* Availability status */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Dispatch Status:</span>
                  {emp.isAvailable ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Available
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      Busy / Off-Duty
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Configure Technician: ${editingEmployee?.fullName}`}
        description="Assign technical departments, role skills, and dispatch availability."
      >
        <form onSubmit={handleUpdate} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Service Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- No Department Assigned --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <Input
            id="emp-designation"
            label="Job Designation / Title"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder="e.g. Senior Electrical Field Engineer"
          />

          <Input
            id="emp-phone"
            label="Mobile / Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +91 9822001122"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Technical Skills (Comma separated)
            </label>
            <Input
              id="emp-skills"
              value={skillsString}
              onChange={(e) => setSkillsString(e.target.value)}
              placeholder="e.g. PLC Siemens S7, SCADA, VFDs, Hydraulics"
              helperText="Used by auto-assignment engine to match tickets with qualified engineers"
            />
          </div>

          <Checkbox
            id="emp-available"
            label="Available for ticket dispatch and customer site visits"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
          />

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
              Save Profile
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
