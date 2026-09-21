'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import {
  Button,
  Input,
  Select,
  Checkbox,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Stepper,
  Badge,
  Alert,
} from '@/components/ui';
import {
  Building2,
  Users,
  LifeBuoy,
  Layers,
  Bell,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

const ONBOARDING_STEPS = [
  { id: 1, label: 'Welcome' },
  { id: 2, label: 'Org Profile' },
  { id: 3, label: 'Departments' },
  { id: 4, label: 'Invite Team' },
  { id: 5, label: 'Products' },
  { id: 6, label: 'SLA Rules' },
  { id: 7, label: 'Notifications' },
  { id: 8, label: 'Review' },
  { id: 9, label: 'Launch' },
];

export default function OnboardingPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tenantName, setTenantName] = useState('Your Organization');
  const [tenantSlug, setTenantSlug] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [profile, setProfile] = useState({
    industry: 'Industrial Equipment & Machinery',
    size: '11-50 employees',
    address: '',
    website: '',
  });

  const [departments, setDepartments] = useState<string[]>([
    'Customer Support Desk',
    'Field Service Technicians',
    'Hardware Quality Lab',
  ]);
  const [newDepartment, setNewDepartment] = useState('');

  const [invitedEmployees, setInvitedEmployees] = useState<
    Array<{ email: string; role: string; department: string }>
  >([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('SUPPORT_EMPLOYEE');
  const [inviteDepartment, setInviteDepartment] = useState('');

  const [productsServices, setProductsServices] = useState<
    Array<{ name: string; category: string; description: string }>
  >([
    { name: 'Model X-200 Precision Chiller', category: 'Heavy Equipment', description: 'Industrial cooling unit' },
    { name: 'Annual Preventative Maintenance', category: 'Service Contract', description: 'Quarterly field inspection' },
  ]);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');

  const [ticketPreferences, setTicketPreferences] = useState({
    defaultPriority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    defaultSlaHours: 24,
    allowCustomerPortal: true,
  });

  const [notificationPreferences, setNotificationPreferences] = useState({
    emailAlerts: true,
    dailyDigest: true,
  });

  // Load existing onboarding state from backend
  useEffect(() => {
    apiClient<{
      tenantName: string;
      tenantSlug: string;
      onboarding: {
        completed?: boolean;
        currentStep?: number;
        profile?: any;
        departments?: string[];
        invitedEmployees?: any[];
        productsServices?: any[];
        ticketPreferences?: any;
        notificationPreferences?: any;
      };
    }>('/tenants/onboarding')
      .then((data) => {
        setTenantName(data.tenantName);
        setTenantSlug(data.tenantSlug);

        const onb = data.onboarding || {};
        if (onb.completed) {
          router.push('/dashboard');
          return;
        }

        if (onb.currentStep && onb.currentStep >= 1 && onb.currentStep <= 9) {
          setCurrentStep(onb.currentStep);
        }
        if (onb.profile) setProfile((prev) => ({ ...prev, ...onb.profile }));
        if (onb.departments && onb.departments.length > 0) setDepartments(onb.departments);
        if (onb.invitedEmployees && onb.invitedEmployees.length > 0)
          setInvitedEmployees(onb.invitedEmployees);
        if (onb.productsServices && onb.productsServices.length > 0)
          setProductsServices(onb.productsServices);
        if (onb.ticketPreferences)
          setTicketPreferences((prev) => ({ ...prev, ...onb.ticketPreferences }));
        if (onb.notificationPreferences)
          setNotificationPreferences((prev) => ({ ...prev, ...onb.notificationPreferences }));
      })
      .catch((err) => {
        if (err instanceof ApiClientError && err.statusCode === 401) {
          router.push('/login');
        } else {
          setError('Failed to load organization onboarding state');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  // Persist progress to backend on each step transition
  const saveProgress = async (nextStep: number) => {
    setIsSaving(true);
    setError(null);

    try {
      await apiClient('/tenants/onboarding', {
        method: 'PATCH',
        body: JSON.stringify({
          currentStep: nextStep,
          profile,
          departments,
          invitedEmployees,
          productsServices,
          ticketPreferences,
          notificationPreferences,
        }),
      });

      setCurrentStep(nextStep);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Failed to save progress');
      } else {
        setError('Network error saving progress');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishOnboarding = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await apiClient('/tenants/onboarding/complete', {
        method: 'POST',
      });
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Failed to complete onboarding');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const addDepartment = () => {
    if (!newDepartment.trim()) return;
    if (!departments.includes(newDepartment.trim())) {
      setDepartments([...departments, newDepartment.trim()]);
    }
    setNewDepartment('');
  };

  const removeDepartment = (dept: string) => {
    setDepartments(departments.filter((d) => d !== dept));
  };

  const addEmployee = () => {
    if (!inviteEmail.trim()) return;
    setInvitedEmployees([
      ...invitedEmployees,
      {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        department: inviteDepartment || departments[0] || 'Support Desk',
      },
    ]);
    setInviteEmail('');
  };

  const removeEmployee = (index: number) => {
    setInvitedEmployees(invitedEmployees.filter((_, i) => i !== index));
  };

  const addProduct = () => {
    if (!prodName.trim()) return;
    setProductsServices([
      ...productsServices,
      {
        name: prodName.trim(),
        category: prodCategory.trim() || 'General Equipment',
        description: 'Standard catalog item',
      },
    ]);
    setProdName('');
    setProdCategory('');
  };

  const removeProduct = (index: number) => {
    setProductsServices(productsServices.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="text-sm text-slate-500 font-medium">Loading organization configuration...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Branding */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              K
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg tracking-tight">KALPAK</span>
              <span className="ml-2 text-xs font-mono text-slate-500">@{tenantSlug}</span>
            </div>
          </div>
          <Badge variant="primary" className="text-xs">
            Client Admin Setup
          </Badge>
        </div>

        {/* Stepper Progress */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs mb-8">
          <Stepper
            steps={ONBOARDING_STEPS}
            currentStep={currentStep}
            onStepClick={(s) => saveProgress(s)}
          />
        </div>

        {error && (
          <div className="mb-6">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        {/* Step Wizard Container */}
        <Card className="shadow-lg shadow-slate-100">
          {/* STEP 1: Welcome */}
          {currentStep === 1 && (
            <div>
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl">Welcome to {tenantName}</CardTitle>
                <CardDescription>
                  Let&apos;s configure your organization workspace. This quick setup will prepare your
                  departments, initial service catalog, and SLA policies. You can update these anytime later
                  in Organization Settings.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-sm space-y-3">
                  <h4 className="font-bold text-slate-900">What we will configure today:</h4>
                  <ul className="space-y-2 text-slate-600 text-xs">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sky-600" />
                      <span>Company profile and operational details</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sky-600" />
                      <span>Service departments for technician routing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sky-600" />
                      <span>Team employee invitations (Technicians & Department Admins)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sky-600" />
                      <span>Basic product categories and SLA response rules</span>
                    </li>
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="justify-end">
                <Button onClick={() => saveProgress(2)} isLoading={isSaving}>
                  <span>Begin Setup</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </div>
          )}

          {/* STEP 2: Organization Profile */}
          {currentStep === 2 && (
            <div>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-3">
                  <Building2 className="w-5 h-5" />
                </div>
                <CardTitle>Organization Profile</CardTitle>
                <CardDescription>
                  Provide high-level context about your company and field service operations.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Primary Industry"
                    value={profile.industry}
                    onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                    options={[
                      { value: 'Industrial Equipment & Machinery', label: 'Industrial Equipment & Machinery' },
                      { value: 'HVAC & Refrigeration', label: 'HVAC & Refrigeration' },
                      { value: 'Medical & Healthcare Devices', label: 'Medical & Healthcare Devices' },
                      { value: 'Telecom & Network Hardware', label: 'Telecom & Network Hardware' },
                      { value: 'Commercial Food Equipment', label: 'Commercial Food Equipment' },
                      { value: 'Other Technical Maintenance', label: 'Other Technical Maintenance' },
                    ]}
                  />

                  <Select
                    label="Company Size"
                    value={profile.size}
                    onChange={(e) => setProfile({ ...profile, size: e.target.value })}
                    options={[
                      { value: '1-10 employees', label: '1-10 employees' },
                      { value: '11-50 employees', label: '11-50 employees' },
                      { value: '51-200 employees', label: '51-200 employees' },
                      { value: '201-500 employees', label: '201-500 employees' },
                      { value: '500+ employees', label: '500+ employees' },
                    ]}
                  />
                </div>

                <Input
                  label="Headquarters Physical Address"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  placeholder="100 Tech Boulevard, Suite 400, Chicago, IL"
                />

                <Input
                  label="Support Portal Website (Optional)"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  placeholder="https://support.acmesolutions.com"
                />
              </CardContent>

              <CardFooter>
                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button onClick={() => saveProgress(3)} isLoading={isSaving}>
                  Save & Continue
                </Button>
              </CardFooter>
            </div>
          )}

          {/* STEP 3: Departments */}
          {currentStep === 3 && (
            <div>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5" />
                </div>
                <CardTitle>Departments & Service Units</CardTitle>
                <CardDescription>
                  Define the organizational units responsible for resolving service calls and tickets.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Field Technicians - North Region"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDepartment())}
                  />
                  <Button type="button" onClick={addDepartment} variant="secondary">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                  {departments.map((dept) => (
                    <div
                      key={dept}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white text-sm"
                    >
                      <span className="font-medium text-slate-800">{dept}</span>
                      <button
                        type="button"
                        onClick={() => removeDepartment(dept)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button onClick={() => saveProgress(4)} isLoading={isSaving}>
                  Save & Continue
                </Button>
              </CardFooter>
            </div>
          )}

          {/* STEP 4: Invite Team */}
          {currentStep === 4 && (
            <div>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <CardTitle>Invite First Employees</CardTitle>
                <CardDescription>
                  Pre-seed your team members. You can skip this step and invite more users later.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Input
                      type="email"
                      placeholder="technician@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <Select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    options={[
                      { value: 'SUPPORT_EMPLOYEE', label: 'Support Employee' },
                      { value: 'DEPARTMENT_ADMIN', label: 'Department Admin' },
                      { value: 'CLIENT_ADMIN', label: 'Client Admin' },
                    ]}
                  />
                  <Select
                    value={inviteDepartment || departments[0] || ''}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    options={departments.map((d) => ({ value: d, label: d }))}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={addEmployee}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add to Invite List
                  </Button>
                </div>

                {invitedEmployees.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {invitedEmployees.map((emp, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white text-sm"
                      >
                        <div>
                          <span className="font-mono text-slate-900">{emp.email}</span>
                          <span className="ml-2 text-xs text-slate-500 font-medium">({emp.role})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeEmployee(index)}
                          className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter>
                <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => saveProgress(5)} isLoading={isSaving}>
                    Skip for Now
                  </Button>
                  <Button onClick={() => saveProgress(5)} isLoading={isSaving}>
                    Save & Continue
                  </Button>
                </div>
              </CardFooter>
            </div>
          )}

          {/* STEP 5: Products & Services */}
          {currentStep === 5 && (
            <div>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                  <Layers className="w-5 h-5" />
                </div>
                <CardTitle>Initial Products & Services</CardTitle>
                <CardDescription>
                  Seed the initial catalog of equipment models or service warranties you maintain.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    placeholder="Product or Service Name"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                  />
                  <Input
                    placeholder="Category (e.g. Chillers, Pumps)"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={addProduct}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
                  </Button>
                </div>

                <div className="space-y-2 pt-2">
                  {productsServices.map((prod, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white text-sm"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{prod.name}</span>
                        <Badge variant="neutral" className="ml-2 text-[10px]">
                          {prod.category}
                        </Badge>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button variant="ghost" onClick={() => setCurrentStep(4)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button onClick={() => saveProgress(6)} isLoading={isSaving}>
                  Save & Continue
                </Button>
              </CardFooter>
            </div>
          )}

          {/* STEP 6: SLA & Priorities */}
          {currentStep === 6 && (
            <div>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <LifeBuoy className="w-5 h-5" />
                </div>
                <CardTitle>Ticket SLA & Priority Rules</CardTitle>
                <CardDescription>
                  Configure baseline resolution targets for incoming service requests.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Default Ticket Priority"
                    value={ticketPreferences.defaultPriority}
                    onChange={(e) =>
                      setTicketPreferences({
                        ...ticketPreferences,
                        defaultPriority: e.target.value as any,
                      })
                    }
                    options={[
                      { value: 'LOW', label: 'Low' },
                      { value: 'MEDIUM', label: 'Medium' },
                      { value: 'HIGH', label: 'High' },
                      { value: 'CRITICAL', label: 'Critical' },
                    ]}
                  />

                  <Input
                    type="number"
                    label="Default SLA Target (Hours)"
                    value={ticketPreferences.defaultSlaHours}
                    onChange={(e) =>
                      setTicketPreferences({
                        ...ticketPreferences,
                        defaultSlaHours: parseInt(e.target.value, 10) || 24,
                      })
                    }
                  />
                </div>

                <div className="pt-2">
                  <Checkbox
                    id="customer-portal-toggle"
                    label="Enable Customer Self-Service Ticket Submission"
                    description="Allow verified customer contacts to submit tickets directly into the queue"
                    checked={ticketPreferences.allowCustomerPortal}
                    onChange={(e) =>
                      setTicketPreferences({
                        ...ticketPreferences,
                        allowCustomerPortal: e.target.checked,
                      })
                    }
                  />
                </div>
              </CardContent>

              <CardFooter>
                <Button variant="ghost" onClick={() => setCurrentStep(5)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button onClick={() => saveProgress(7)} isLoading={isSaving}>
                  Save & Continue
                </Button>
              </CardFooter>
            </div>
          )}

          {/* STEP 7: Notification Preferences */}
          {currentStep === 7 && (
            <div>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
                  <Bell className="w-5 h-5" />
                </div>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Select how administrators and supervisors receive operational alerts.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Checkbox
                    id="email-alerts-toggle"
                    label="Real-Time SLA Warning & Escalation Alerts"
                    description="Notify team leads immediately when a ticket reaches 75% of its resolution SLA"
                    checked={notificationPreferences.emailAlerts}
                    onChange={(e) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        emailAlerts: e.target.checked,
                      })
                    }
                  />

                  <Checkbox
                    id="daily-digest-toggle"
                    label="Daily Operational Summary Digest"
                    description="Receive morning report of unresolved tickets, aging work orders, and technician workload"
                    checked={notificationPreferences.dailyDigest}
                    onChange={(e) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        dailyDigest: e.target.checked,
                      })
                    }
                  />
                </div>
              </CardContent>

              <CardFooter>
                <Button variant="ghost" onClick={() => setCurrentStep(6)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button onClick={() => saveProgress(8)} isLoading={isSaving}>
                  Save & Continue
                </Button>
              </CardFooter>
            </div>
          )}

          {/* STEP 8: Review Configuration */}
          {currentStep === 8 && (
            <div>
              <CardHeader>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <CardTitle>Review Configuration</CardTitle>
                <CardDescription>
                  Confirm your initial settings before opening the operational service dashboard.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-500 uppercase">Organization Profile</span>
                    <p className="mt-1 font-semibold text-slate-800 text-sm">{profile.industry}</p>
                    <p className="text-slate-500">{profile.size}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-500 uppercase">SLA & Defaults</span>
                    <p className="mt-1 font-semibold text-slate-800 text-sm">
                      {ticketPreferences.defaultPriority} Priority Default
                    </p>
                    <p className="text-slate-500">{ticketPreferences.defaultSlaHours}h resolution SLA</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-500 uppercase">Departments ({departments.length})</span>
                    <p className="mt-1 text-slate-700">{departments.join(', ')}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="font-bold text-slate-500 uppercase">
                      Catalog Products ({productsServices.length})
                    </span>
                    <p className="mt-1 text-slate-700">
                      {productsServices.map((p) => p.name).slice(0, 2).join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button variant="ghost" onClick={() => setCurrentStep(7)}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button onClick={() => saveProgress(9)} isLoading={isSaving}>
                  Confirm & Continue
                </Button>
              </CardFooter>
            </div>
          )}

          {/* STEP 9: Launch */}
          {currentStep === 9 && (
            <div className="py-6 text-center">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8" />
                </div>
                <CardTitle className="text-3xl">Setup Complete!</CardTitle>
                <CardDescription className="max-w-md mx-auto text-sm mt-2">
                  Your tenant workspace for <strong className="text-slate-900">{tenantName}</strong> is
                  configured and ready for service operations.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Button
                  size="lg"
                  onClick={handleFinishOnboarding}
                  isLoading={isSaving}
                  className="px-8 shadow-lg text-base h-12"
                >
                  <span>Launch Operations Dashboard</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </CardContent>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
