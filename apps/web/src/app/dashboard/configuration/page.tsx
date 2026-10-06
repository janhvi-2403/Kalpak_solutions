'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Layers,
  UserCheck,
  Mail,
  Phone,
  Globe,
  MapPin,
  Clock,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Send,
  RefreshCw,
  XCircle,
  Copy,
  Check,
  Info,
  Wrench,
  Package,
  HelpCircle,
  SlidersHorizontal,
  Upload,
  ImageIcon,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
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
import {
  ServiceCategoriesTab,
  ServiceCategoryItem,
  PriorityItem,
} from './components/service-categories-tab';
import {
  TicketAssignmentRulesTab,
  AssignmentRuleItem,
} from './components/ticket-assignment-rules-tab';
import { EmailConfigurationTab } from './components/email-configuration-tab';

// ==============================================================================
// Types & Constants
// ==============================================================================

interface HolidayItem {
  id: string;
  name: string;
  date: string;
}

interface CompanyProfileData {
  name: string;
  logoUrl: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  officialEmail: string;
  phone: string;
  website: string;
  timezone: string;
  dateTimeFormat: string;
  workingDays: string[];
  businessHoursStart: string;
  businessHoursEnd: string;
  holidays: HolidayItem[];
}

interface DepartmentData {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
  skills: string[];
  products: string[];
  services: string[];
  issueTypes: string[];
  headUser?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    designation?: string;
    isActive?: boolean;
    lastLoginAt?: string | null;
  } | null;
  memberCount: number;
  productCount: number;
  createdAt: string;
}

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  department?: string;
  fullName?: string;
  phone?: string;
  designation?: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  token?: string;
  inviteUrl?: string;
}

interface UserMemberItem {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  role: string;
  joinedAt: string;
  lastLoginAt: string | null;
  department?: string;
  designation?: string;
}

const DEFAULT_SKILLS = [
  'Gearbox Repair',
  'Motor Repair',
  'Electrical Maintenance',
  'Preventive Maintenance',
  'Vibration Analysis',
  'PLC & Automation',
  'Hydraulic Troubleshooting',
  'Calibration & Testing',
];

const DEFAULT_PRODUCTS = [
  'Gearbox',
  'Motor',
  'Conveyor',
  'Hydraulic Press',
  'CNC Milling Unit',
  'Industrial Chiller',
  'Pneumatic Feeder',
];

const DEFAULT_SERVICES = [
  'Installation',
  'Repair',
  'Maintenance',
  'Emergency Breakdown',
  'Warranty Audit',
  'Retrofit & Upgrade',
  'Annual Maintenance Contract (AMC)',
];

const DEFAULT_ISSUE_TYPES = [
  'Machine Breakdown',
  'Gearbox Problem',
  'Motor Failure',
  'Installation Request',
  'Preventive Maintenance',
  'Oil Leakage',
  'High Vibration Alert',
  'Electrical Short Circuit',
  'Abnormal Noise',
];

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +05:30) - Mumbai, New Delhi' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT -05:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST +00:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST +04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT +08:00)' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY hh:mm A', label: 'DD/MM/YYYY hh:mm A (23/09/2026 07:30 PM)' },
  { value: 'MM/DD/YYYY hh:mm A', label: 'MM/DD/YYYY hh:mm A (09/23/2026 07:30 PM)' },
  { value: 'YYYY-MM-DD HH:mm', label: 'YYYY-MM-DD HH:mm (2026-09-23 19:30)' },
  { value: 'DD MMM YYYY, hh:mm A', label: 'DD MMM YYYY (23 Sep 2026, 07:30 PM)' },
];

const DEFAULT_SERVICE_CATEGORIES: ServiceCategoryItem[] = [
  {
    id: 'cat-1',
    name: 'Mechanical Breakdown',
    code: 'MECH',
    description: 'Physical equipment failure, motor breakdowns, bearing failure, and mechanical jams.',
    subcategories: ['Gearbox Assembly', 'Electric Motors', 'Conveyor Systems', 'Bearings & Shafts'],
    issueTypes: ['Machine Breakdown', 'Abnormal Noise', 'High Vibration Alert', 'Gearbox Seizure'],
    isActive: true,
  },
  {
    id: 'cat-2',
    name: 'Electrical & Automation',
    code: 'ELEC',
    description: 'Power distribution, short circuits, PLC controls, VFD drives, and sensor errors.',
    subcategories: ['PLC & SCADA', 'VFD & Drives', 'Control Panels', 'Sensors & Transducers'],
    issueTypes: ['Electrical Short Circuit', 'Drive Tripping', 'Sensor Fault', 'Power Fluctuation'],
    isActive: true,
  },
  {
    id: 'cat-3',
    name: 'Hydraulic & Pneumatic Systems',
    code: 'HYDR',
    description: 'Fluid power units, hydraulic press cylinders, air compressors, and pneumatic valves.',
    subcategories: ['Hydraulic Power Pack', 'Pneumatic Actuators', 'Valves & Manifolds', 'Hoses & Fittings'],
    issueTypes: ['Oil Leakage', 'Low Pressure Alert', 'Cylinder Jerk', 'Seal Rupture'],
    isActive: true,
  },
  {
    id: 'cat-4',
    name: 'Preventive & Periodic Maintenance',
    code: 'PM',
    description: 'Scheduled servicing, lubrication cycles, thermal imaging, and safety audits.',
    subcategories: ['Monthly PM Check', 'Lubrication & Greasing', 'Calibration Audit', 'Vibration Analysis'],
    issueTypes: ['Preventive Maintenance', 'Quarterly Overhaul', 'Calibration Due'],
    isActive: true,
  },
  {
    id: 'cat-5',
    name: 'Installation & Commissioning',
    code: 'COMM',
    description: 'New machine setup, factory site installation, wiring, and warranty sign-off.',
    subcategories: ['Turnkey Installation', 'Site Readiness Inspection', 'Warranty Validation', 'Operator Training'],
    issueTypes: ['Installation Request', 'Commissioning Sign-off', 'Warranty Claim'],
    isActive: true,
  },
];

const DEFAULT_PRIORITIES: PriorityItem[] = [
  {
    level: 'CRITICAL',
    label: 'P1 - Critical',
    responseTargetHours: 1,
    resolutionTargetHours: 4,
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Complete production stoppage, safety hazard, or critical line outage.',
  },
  {
    level: 'HIGH',
    label: 'P2 - High',
    responseTargetHours: 2,
    resolutionTargetHours: 12,
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Major impairment to operations; equipment running in degraded or risky mode.',
  },
  {
    level: 'MEDIUM',
    label: 'P3 - Medium',
    responseTargetHours: 4,
    resolutionTargetHours: 24,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Scheduled component maintenance, non-fatal operational fault, or partial failure.',
  },
  {
    level: 'LOW',
    label: 'P4 - Low',
    responseTargetHours: 8,
    resolutionTargetHours: 48,
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    description: 'Minor inquiries, documentation requests, aesthetic repairs, or routine questions.',
  },
];

const DEFAULT_ASSIGNMENT_RULES: AssignmentRuleItem[] = [
  {
    id: 'rule-1',
    name: 'Critical Electrical & PLC Routing',
    description: 'Route all Critical electrical breakdowns directly to the Electrical Maintenance department.',
    priorityOrder: 1,
    isActive: true,
    conditions: {
      category: 'Electrical & Automation',
      priority: 'CRITICAL',
    },
    target: {
      departmentId: 'dept-demo-1',
      departmentName: 'Maintenance Department',
      assigneeName: 'Senior Electrical Engineer (Lead)',
    },
  },
  {
    id: 'rule-2',
    name: 'Hydraulic Breakdown & Leakage Routing',
    description: 'Auto-assign hydraulic pressure drops and oil leakage to the Mechanical/Hydraulics unit.',
    priorityOrder: 2,
    isActive: true,
    conditions: {
      category: 'Hydraulic & Pneumatic Systems',
    },
    target: {
      departmentId: 'dept-demo-1',
      departmentName: 'Maintenance Department',
      assigneeName: 'Hydraulics Specialist',
    },
  },
  {
    id: 'rule-3',
    name: 'Preventive Maintenance Scheduling',
    description: 'Route routine and periodic servicing to Field Operations.',
    priorityOrder: 3,
    isActive: true,
    conditions: {
      category: 'Preventive & Periodic Maintenance',
    },
    target: {
      departmentId: 'dept-demo-1',
      departmentName: 'Maintenance Department',
      assigneeName: 'Service Operations Lead',
    },
  },
];

export default function ConfigurationPage() {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'departments' | 'heads' | 'categories' | 'rules' | 'email'>('company');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 4. Service Categories & Priorities State
  const [serviceCategories, setServiceCategories] = useState<ServiceCategoryItem[]>(DEFAULT_SERVICE_CATEGORIES);
  const [priorities, setPriorities] = useState<PriorityItem[]>(DEFAULT_PRIORITIES);

  // 5. Ticket Assignment Rules State
  const [assignmentRules, setAssignmentRules] = useState<AssignmentRuleItem[]>(DEFAULT_ASSIGNMENT_RULES);

  // 1. Company Configuration State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileData>({
    name: 'MasterCard Solutions Pvt Ltd',
    logoUrl: '',
    address: 'Plot 42, Hinjewadi Phase 1, MIDC Tech Park',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    pincode: '411057',
    officialEmail: 'support@mastercard-solutions.com',
    phone: '+91 7498862377',
    website: 'https://mastercard.com',
    timezone: 'Asia/Kolkata',
    dateTimeFormat: 'DD/MM/YYYY hh:mm A',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    holidays: [
      { id: '1', name: 'Republic Day', date: '2026-01-26' },
      { id: '2', name: 'Maharashtra Day / Labour Day', date: '2026-05-01' },
      { id: '3', name: 'Independence Day', date: '2026-08-15' },
      { id: '4', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02' },
      { id: '5', name: 'Diwali (Laxmi Pujan)', date: '2026-11-08' },
      { id: '6', name: 'Christmas Day', date: '2026-12-25' },
    ],
  });

  // Holiday Modal State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  // 2. Department Configuration State
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);

  // Department Form State
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptDescription, setDeptDescription] = useState('');
  const [deptStatus, setDeptStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [customProductInput, setCustomProductInput] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customServiceInput, setCustomServiceInput] = useState('');
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<string[]>([]);
  const [customIssueTypeInput, setCustomIssueTypeInput] = useState('');

  // 3. Department Head & Invitations State
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserMemberItem[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteDeptName, setInviteDeptName] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteDesignation, setInviteDesignation] = useState('Department Head');
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [sentInviteModalData, setSentInviteModalData] = useState<{
    email: string;
    fullName: string;
    department: string;
    inviteUrl: string;
  } | null>(null);

  // Load initial configuration data from server
  const loadConfiguration = useCallback(async () => {
    try {
      setIsLoading(true);
      setFeedback(null);

      // 1. Fetch current tenant details
      const tenantRes = await apiClient<any>('/tenants/current').catch(() => null);
      if (tenantRes) {
        const settings = tenantRes.settings || {};
        const profile = settings.companyProfile || {};

        setCompanyProfile({
          name: profile.name || tenantRes.name || 'MasterCard Solutions Pvt Ltd',
          logoUrl: profile.logoUrl || settings.logoUrl || '',
          address: profile.address || 'Plot 42, Hinjewadi Phase 1, MIDC Tech Park',
          city: profile.city || 'Pune',
          state: profile.state || 'Maharashtra',
          country: profile.country || 'India',
          pincode: profile.pincode || '411057',
          officialEmail: profile.supportEmail || profile.officialEmail || 'support@mastercard-solutions.com',
          phone: profile.phone || '+91 7498862377',
          website: profile.website || 'https://mastercard.com',
          timezone: profile.timezone || 'Asia/Kolkata',
          dateTimeFormat: profile.dateTimeFormat || 'DD/MM/YYYY hh:mm A',
          workingDays: profile.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          businessHoursStart: profile.businessHoursStart || '09:00',
          businessHoursEnd: profile.businessHoursEnd || '18:00',
          holidays: profile.holidays && profile.holidays.length > 0 ? profile.holidays : [
            { id: '1', name: 'Republic Day', date: '2026-01-26' },
            { id: '2', name: 'Maharashtra Day / Labour Day', date: '2026-05-01' },
            { id: '3', name: 'Independence Day', date: '2026-08-15' },
            { id: '4', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02' },
            { id: '5', name: 'Diwali (Laxmi Pujan)', date: '2026-11-08' },
            { id: '6', name: 'Christmas Day', date: '2026-12-25' },
          ],
        });

        if (settings.serviceCategories && Array.isArray(settings.serviceCategories) && settings.serviceCategories.length > 0) {
          setServiceCategories(settings.serviceCategories);
        }
        if (settings.priorities && Array.isArray(settings.priorities) && settings.priorities.length > 0) {
          setPriorities(settings.priorities);
        }
        if (settings.assignmentRules && Array.isArray(settings.assignmentRules) && settings.assignmentRules.length > 0) {
          setAssignmentRules(settings.assignmentRules);
        }
      }

      // 2. Fetch departments
      const deptsRes = await apiClient<any[]>('/departments').catch(() => []);
      if (deptsRes && Array.isArray(deptsRes)) {
        const enriched = deptsRes.map((d) => {
          return {
            id: d.id,
            name: d.name,
            code: d.code,
            description: d.description || '',
            status: (d.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
            skills: d.skills || [
              'Gearbox Repair',
              'Motor Repair',
              'Electrical Maintenance',
              'Preventive Maintenance',
            ],
            products: d.products || ['Gearbox', 'Motor', 'Conveyor'],
            services: d.services || ['Installation', 'Repair', 'Maintenance'],
            issueTypes: d.issueTypes || [
              'Machine Breakdown',
              'Gearbox Problem',
              'Motor Failure',
              'Installation Request',
              'Preventive Maintenance',
            ],
            headUser: d.headUser || null,
            memberCount: d.memberCount || 0,
            productCount: d.productCount || 0,
            createdAt: d.createdAt,
          };
        });

        if (enriched.length === 0) {
          setDepartments([
            {
              id: 'dept-demo-1',
              name: 'Maintenance Department',
              code: 'MAINT',
              description: 'Responsible for electro-mechanical equipment repairs, motor overhauls, and preventive maintenance.',
              status: 'ACTIVE',
              skills: ['Gearbox Repair', 'Motor Repair', 'Electrical Maintenance', 'Preventive Maintenance'],
              products: ['Gearbox', 'Motor', 'Conveyor'],
              services: ['Installation', 'Repair', 'Maintenance'],
              issueTypes: [
                'Machine Breakdown',
                'Gearbox Problem',
                'Motor Failure',
                'Installation Request',
                'Preventive Maintenance',
              ],
              headUser: null,
              memberCount: 2,
              productCount: 3,
              createdAt: new Date().toISOString(),
            },
          ]);
        } else {
          setDepartments(enriched);
        }
      }

      // 3. Fetch Invitations
      const invRes = await apiClient<any[]>('/tenants/invitations').catch(() => []);
      if (invRes && Array.isArray(invRes)) {
        setInvitations(invRes);
      } else {
        setInvitations([]);
      }

      // 4. Fetch team members for Department Head directory
      const usersRes = await apiClient<any>('/users?limit=50').catch(() => null);
      if (usersRes && usersRes.items) {
        setTeamMembers(usersRes.items);
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load configuration data.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  // --------------------------------------------------------------------------
  // Logo Image File Upload Handlers
  // --------------------------------------------------------------------------
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        text: 'Logo image must be smaller than 5MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setCompanyProfile((prev) => ({
          ...prev,
          logoUrl: reader.result as string,
        }));
        setFeedback({
          type: 'success',
          text: `Logo "${file.name}" uploaded successfully! Click "Save Company Configuration" to apply.`,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setCompanyProfile((prev) => ({
      ...prev,
      logoUrl: '',
    }));
    setFeedback({
      type: 'success',
      text: 'Logo removed. Click "Save Company Configuration" to apply.',
    });
  };

  // --------------------------------------------------------------------------
  // Save Company Configuration
  // --------------------------------------------------------------------------
  const handleSaveCompanyConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setFeedback(null);

      await apiClient('/tenants/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: companyProfile.name.trim(),
          logoUrl: companyProfile.logoUrl?.trim() || undefined,
          address: companyProfile.address.trim(),
          city: companyProfile.city.trim(),
          state: companyProfile.state.trim(),
          country: companyProfile.country.trim(),
          pincode: companyProfile.pincode.trim(),
          supportEmail: companyProfile.officialEmail.trim(),
          phone: companyProfile.phone.trim(),
          website: companyProfile.website.trim(),
          timezone: companyProfile.timezone,
          dateTimeFormat: companyProfile.dateTimeFormat,
          workingDays: companyProfile.workingDays,
          businessHoursStart: companyProfile.businessHoursStart,
          businessHoursEnd: companyProfile.businessHoursEnd,
          businessHours: `${companyProfile.businessHoursStart} - ${companyProfile.businessHoursEnd}`,
          holidays: companyProfile.holidays,
        }),
      });

      setFeedback({
        type: 'success',
        text: 'Company identity & operational configuration updated successfully!',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save company configuration',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddHoliday = () => {
    if (!newHolidayName.trim() || !newHolidayDate) return;
    const item: HolidayItem = {
      id: String(Date.now()),
      name: newHolidayName.trim(),
      date: newHolidayDate,
    };
    setCompanyProfile((prev) => ({
      ...prev,
      holidays: [...prev.holidays, item].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    setNewHolidayName('');
    setNewHolidayDate('');
    setIsHolidayModalOpen(false);
  };

  const handleRemoveHoliday = (id: string) => {
    setCompanyProfile((prev) => ({
      ...prev,
      holidays: prev.holidays.filter((h) => h.id !== id),
    }));
  };

  const toggleWorkingDay = (day: string) => {
    setCompanyProfile((prev) => {
      const exists = prev.workingDays.includes(day);
      return {
        ...prev,
        workingDays: exists
          ? prev.workingDays.filter((d) => d !== day)
          : [...prev.workingDays, day],
      };
    });
  };

  // --------------------------------------------------------------------------
  // Department Management
  // --------------------------------------------------------------------------
  const openAddDepartmentModal = () => {
    setEditingDeptId(null);
    setDeptName('');
    setDeptCode('');
    setDeptDescription('');
    setDeptStatus('ACTIVE');
    setSelectedSkills([...DEFAULT_SKILLS.slice(0, 4)]);
    setSelectedProducts([...DEFAULT_PRODUCTS.slice(0, 3)]);
    setSelectedServices([...DEFAULT_SERVICES.slice(0, 3)]);
    setSelectedIssueTypes([...DEFAULT_ISSUE_TYPES.slice(0, 5)]);
    setIsDeptModalOpen(true);
  };

  const openEditDepartmentModal = (dept: DepartmentData) => {
    setEditingDeptId(dept.id);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptDescription(dept.description);
    setDeptStatus(dept.status);
    setSelectedSkills(dept.skills || []);
    setSelectedProducts(dept.products || []);
    setSelectedServices(dept.services || []);
    setSelectedIssueTypes(dept.issueTypes || []);
    setIsDeptModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) return;

    try {
      setIsSaving(true);
      setFeedback(null);

      if (editingDeptId && !editingDeptId.startsWith('dept-demo')) {
        await apiClient(`/departments/${editingDeptId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: deptName.trim(),
            code: deptCode.trim().toUpperCase(),
            description: deptDescription.trim() || undefined,
          }),
        });
      } else if (!editingDeptId) {
        await apiClient('/departments', {
          method: 'POST',
          body: JSON.stringify({
            name: deptName.trim(),
            code: deptCode.trim().toUpperCase(),
            description: deptDescription.trim() || undefined,
          }),
        });
      }

      setDepartments((prev) => {
        if (editingDeptId) {
          return prev.map((d) =>
            d.id === editingDeptId
              ? {
                  ...d,
                  name: deptName.trim(),
                  code: deptCode.trim().toUpperCase(),
                  description: deptDescription.trim(),
                  status: deptStatus,
                  skills: selectedSkills,
                  products: selectedProducts,
                  services: selectedServices,
                  issueTypes: selectedIssueTypes,
                }
              : d
          );
        } else {
          const newDept: DepartmentData = {
            id: `dept-${Date.now()}`,
            name: deptName.trim(),
            code: deptCode.trim().toUpperCase(),
            description: deptDescription.trim(),
            status: deptStatus,
            skills: selectedSkills,
            products: selectedProducts,
            services: selectedServices,
            issueTypes: selectedIssueTypes,
            headUser: null,
            memberCount: 0,
            productCount: selectedProducts.length,
            createdAt: new Date().toISOString(),
          };
          return [...prev, newDept];
        }
      });

      setFeedback({
        type: 'success',
        text: `Department "${deptName}" saved successfully with ${selectedSkills.length} skills and ${selectedIssueTypes.length} query types.`,
      });
      setIsDeptModalOpen(false);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save department',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete department "${name}"? Historical ticket records will remain preserved.`)) return;

    try {
      if (!id.startsWith('dept-demo')) {
        await apiClient(`/departments/${id}`, { method: 'DELETE' });
      }
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      setFeedback({
        type: 'success',
        text: `Department "${name}" deleted.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete department',
      });
    }
  };

  const toggleItem = (setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const addCustomItem = (
    input: string,
    setInput: React.Dispatch<React.SetStateAction<string>>,
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (!input.trim()) return;
    setList((prev) => (prev.includes(input.trim()) ? prev : [...prev, input.trim()]));
    setInput('');
  };

  // --------------------------------------------------------------------------
  // Department Head / POC Invitation & Management
  // --------------------------------------------------------------------------
  const openInviteModalForDept = (departmentName: string) => {
    setInviteDeptName(departmentName);
    setInviteFullName('');
    setInviteEmail('');
    setInvitePhone('');
    setInviteDesignation('Department Head & POC');
    setIsInviteModalOpen(true);
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setIsSaving(true);
      setFeedback(null);

      const res = await apiClient<any>('/tenants/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: 'DEPARTMENT_ADMIN',
          department: inviteDeptName,
          fullName: inviteFullName.trim() || undefined,
          phone: invitePhone.trim() || undefined,
          designation: inviteDesignation.trim() || undefined,
        }),
      });

      setFeedback({
        type: 'success',
        text: `Official invitation sent to ${inviteEmail} for ${inviteDeptName}! Real invitation created.`,
      });
      if (res?.invitation?.inviteUrl) {
        setSentInviteModalData({
          email: inviteEmail.trim(),
          fullName: inviteFullName.trim() || 'Department Head Candidate',
          department: inviteDeptName,
          inviteUrl: res.invitation.inviteUrl,
        });
      }
      setIsInviteModalOpen(false);
      await loadConfiguration();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to send invitation',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendInvitation = async (invId: string, email: string) => {
    try {
      if (!invId.startsWith('inv-')) {
        const res = await apiClient<any>(`/tenants/invitations/${invId}/resend`, { method: 'POST' });
        if (res?.inviteUrl || res?.token) {
          setInvitations((prev) =>
            prev.map((inv) =>
              inv.id === invId
                ? { ...inv, token: res.token, inviteUrl: res.inviteUrl, expiresAt: res.expiresAt || inv.expiresAt }
                : inv
            )
          );
        }
      }
      setFeedback({
        type: 'success',
        text: `Fresh invitation token generated for ${email}! Click 'Copy Link' to share immediately.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to resend invitation',
      });
    }
  };

  const handleRevokeInvitation = async (invId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) return;

    try {
      if (!invId.startsWith('inv-')) {
        await apiClient(`/tenants/invitations/${invId}`, { method: 'DELETE' });
      }
      setInvitations((prev) => prev.filter((inv) => inv.id !== invId));
      setFeedback({
        type: 'success',
        text: `Invitation for ${email} has been revoked.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to revoke invitation',
      });
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean, name: string) => {
    const actionText = currentStatus ? 'deactivate' : 'reactivate';
    if (
      !confirm(
        `Are you sure you want to ${actionText} ${name}? Deactivation will disable their login while strictly preserving all historical tickets and audit logs.`
      )
    )
      return;

    try {
      await apiClient(`/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      setTeamMembers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, isActive: !currentStatus } : u))
      );

      setFeedback({
        type: 'success',
        text: `${name} has been ${!currentStatus ? 'activated' : 'deactivated'} safely. Historical ticket associations remain intact.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : `Failed to ${actionText} user`,
      });
    }
  };

  const copyInviteLink = async (inv: InvitationItem) => {
    let link = inv.inviteUrl;
    if (!link && inv.token) {
      link = `${window.location.origin}/accept-invitation?token=${inv.token}`;
    }
    if (!link && !inv.id.startsWith('inv-')) {
      try {
        const res = await apiClient<any>(`/tenants/invitations/${inv.id}/resend`, { method: 'POST' });
        if (res?.inviteUrl) {
          link = res.inviteUrl;
          setInvitations((prev) =>
            prev.map((item) => (item.id === inv.id ? { ...item, inviteUrl: res.inviteUrl, token: res.token } : item))
          );
        }
      } catch {
        link = `${window.location.origin}/accept-invitation?token=pending`;
      }
    }
    if (!link) {
      link = `${window.location.origin}/accept-invitation?token=pending`;
    }

    try {
      await navigator.clipboard.writeText(link);
      setCopiedInviteId(inv.id);
      setFeedback({
        type: 'success',
        text: `Direct single-use activation link copied to clipboard! You can share it directly with ${inv.email}.`,
      });
      setTimeout(() => setCopiedInviteId(null), 3000);
    } catch {
      setFeedback({
        type: 'error',
        text: 'Unable to write to clipboard automatically.',
      });
    }
  };

  // --------------------------------------------------------------------------
  // Service Categories & Assignment Rules Handlers
  // --------------------------------------------------------------------------
  const handleSaveCategories = async (updated: ServiceCategoryItem[]) => {
    try {
      setIsSaving(true);
      setServiceCategories(updated);
      await apiClient('/tenants/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          serviceCategories: updated,
        }),
      });
      setFeedback({
        type: 'success',
        text: 'Service categories successfully updated and saved!',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save service categories.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePriorities = async (updated: PriorityItem[]) => {
    try {
      setIsSaving(true);
      setPriorities(updated);
      await apiClient('/tenants/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          priorities: updated,
        }),
      });
      setFeedback({
        type: 'success',
        text: 'Priority SLA response & resolution target hours successfully updated!',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save SLA targets.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAssignmentRules = async (updated: AssignmentRuleItem[]) => {
    try {
      setIsSaving(true);
      setAssignmentRules(updated);
      await apiClient('/tenants/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          assignmentRules: updated,
        }),
      });
      setFeedback({
        type: 'success',
        text: 'Ticket assignment rules successfully updated and activated!',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save assignment rules.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/20">
              <SlidersHorizontal className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Organization & Operations Configuration
              </h1>
              <p className="text-xs text-slate-500">
                Configure company identity, service departments, technical skills, handled issue types, and Department Head POCs.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          {activeSubTab === 'departments' && (
            <Button
              onClick={openAddDepartmentModal}
              className="gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </Button>
          )}
          {activeSubTab === 'heads' && (
            <Button
              onClick={() => openInviteModalForDept(departments[0]?.name || 'Maintenance Department')}
              className="gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>Invite Department Head</span>
            </Button>
          )}
        </div>
      </div>

      {/* Sub-Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => {
            setActiveSubTab('company');
            setFeedback(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all border-b-2 ${
            activeSubTab === 'company'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>1. Company Configuration</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('departments');
            setFeedback(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all border-b-2 ${
            activeSubTab === 'departments'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Department Configuration ⭐</span>
          <Badge variant="primary" className="bg-orange-100 text-orange-700 font-mono text-[10px] ml-1">
            {departments.length}
          </Badge>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('heads');
            setFeedback(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all border-b-2 ${
            activeSubTab === 'heads'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>3. Department Head Management</span>
          {invitations.length > 0 && (
            <Badge variant="warning" className="bg-amber-100 text-amber-800 font-mono text-[10px] ml-1">
              {invitations.length} Pending
            </Badge>
          )}
        </button>

        <button
          onClick={() => {
            setActiveSubTab('categories');
            setFeedback(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all border-b-2 ${
            activeSubTab === 'categories'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>4. Service Categories &amp; Priorities</span>
          <Badge variant="primary" className="bg-orange-100 text-orange-700 font-mono text-[10px] ml-1">
            {serviceCategories.length}
          </Badge>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('rules');
            setFeedback(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all border-b-2 ${
            activeSubTab === 'rules'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>5. Ticket Assignment Rules</span>
          <Badge variant="primary" className="bg-orange-100 text-orange-700 font-mono text-[10px] ml-1">
            {assignmentRules.length}
          </Badge>
        </button>

        <button
          onClick={() => {
            setActiveSubTab('email');
            setFeedback(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-sm transition-all border-b-2 ${
            activeSubTab === 'email'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>6. Email Configuration</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
        </button>
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in-50 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="p-6 bg-white rounded-2xl border border-slate-200 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : (
        <>
          {/* ================================================================= */}
          {/* TAB 1: COMPANY CONFIGURATION                                      */}
          {/* ================================================================= */}
          {activeSubTab === 'company' && (
            <form onSubmit={handleSaveCompanyConfig} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1 & 2: Company Identity & Location */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Card 1: Company Profile */}
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-orange-600" />
                        <CardTitle className="text-base font-bold text-slate-900">
                          Company Profile & Identity
                        </CardTitle>
                      </div>
                      <p className="text-xs text-slate-500">
                        Official brand name, logos, and primary corporate communication channels.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          id="company-name"
                          label="Company / Business Name"
                          required
                          value={companyProfile.name}
                          onChange={(e) =>
                            setCompanyProfile({ ...companyProfile, name: e.target.value })
                          }
                          placeholder="e.g. MasterCard Solutions Pvt Ltd"
                        />

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Company Brand Logo
                          </label>
                          <div className="flex items-center gap-3">
                            {companyProfile.logoUrl ? (
                              <div className="relative group w-14 h-14 rounded-xl border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={companyProfile.logoUrl}
                                  alt="Company Logo"
                                  className="max-h-full max-w-full object-contain rounded-lg"
                                />
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}

                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-colors shadow-xs">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{companyProfile.logoUrl ? 'Change Image' : 'Upload Image File'}</span>
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                  />
                                </label>

                                {companyProfile.logoUrl && (
                                  <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    className="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">
                                Supports PNG, JPG, SVG or WebP (Max 5MB).
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          id="company-email"
                          label="Official Support Email"
                          type="email"
                          required
                          value={companyProfile.officialEmail}
                          onChange={(e) =>
                            setCompanyProfile({ ...companyProfile, officialEmail: e.target.value })
                          }
                          placeholder="support@company.com"
                        />

                        <Input
                          id="company-phone"
                          label="Official Contact Phone"
                          required
                          value={companyProfile.phone}
                          onChange={(e) =>
                            setCompanyProfile({ ...companyProfile, phone: e.target.value })
                          }
                          placeholder="+91 7498862377"
                        />

                        <Input
                          id="company-website"
                          label="Website URL"
                          value={companyProfile.website}
                          onChange={(e) =>
                            setCompanyProfile({ ...companyProfile, website: e.target.value })
                          }
                          placeholder="https://company.com"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 2: Company Address */}
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-orange-600" />
                        <CardTitle className="text-base font-bold text-slate-900">
                          Headquarters Address
                        </CardTitle>
                      </div>
                      <p className="text-xs text-slate-500">
                        Physical factory or headquarters location printed on service tickets and SLA documents.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Street / Facility Address
                        </label>
                        <textarea
                          rows={2}
                          value={companyProfile.address}
                          onChange={(e) =>
                            setCompanyProfile({ ...companyProfile, address: e.target.value })
                          }
                          placeholder="e.g. Plot 42, Hinjewadi Phase 1, MIDC Tech Park"
                          className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Input
                          id="address-city"
                          label="City"
                          value={companyProfile.city}
                          onChange={(e) =>
                            setCompanyProfile({ ...companyProfile, city: e.target.value })
                          }
                          placeholder="Pune"
                        />
                        <Input
                          id="address-state"
                          label="State / Province"
                          value={companyProfile.state}
                          onChange={(e) =>
                            setCompanyProfile({ ...companyProfile, state: e.target.value })
                          }
                          placeholder="Maharashtra"
                        />
                        <Input
                          id="address-country"
                          label="Country"
                          value={companyProfile.country}
                          onChange={(e) =>
                            setCompanyProfile({ ...companyProfile, country: e.target.value })
                          }
                          placeholder="India"
                        />
                        <Input
                          id="address-pincode"
                          label="Pincode / Postal"
                          value={companyProfile.pincode}
                          onChange={(e) =>
                            setCompanyProfile({ ...companyProfile, pincode: e.target.value })
                          }
                          placeholder="411057"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card 3: Working Days & Business Hours */}
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <CardTitle className="text-base font-bold text-slate-900">
                          Working Schedule & Business Hours
                        </CardTitle>
                      </div>
                      <p className="text-xs text-slate-500">
                        Operational hours calculate ticket SLA response time and technician availability windows.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          Standard Working Days
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {DAYS_OF_WEEK.map((day) => {
                            const isSelected = companyProfile.workingDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => toggleWorkingDay(day)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                  isSelected
                                    ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Shift Start Time
                          </label>
                          <input
                            type="time"
                            value={companyProfile.businessHoursStart}
                            onChange={(e) =>
                              setCompanyProfile({
                                ...companyProfile,
                                businessHoursStart: e.target.value,
                              })
                            }
                            className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Shift End Time
                          </label>
                          <input
                            type="time"
                            value={companyProfile.businessHoursEnd}
                            onChange={(e) =>
                              setCompanyProfile({
                                ...companyProfile,
                                businessHoursEnd: e.target.value,
                              })
                            }
                            className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Column 3: Regional & Holiday Schedule */}
                <div className="space-y-6">
                  {/* Regional Format */}
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-orange-600" />
                        <CardTitle className="text-base font-bold text-slate-900">
                          Regional & Timezone
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Operational Timezone
                        </label>
                        <select
                          value={companyProfile.timezone}
                          onChange={(e) =>
                            setCompanyProfile({ ...companyProfile, timezone: e.target.value })
                          }
                          className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        >
                          {TIMEZONES.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Date & Time Display Format
                        </label>
                        <select
                          value={companyProfile.dateTimeFormat}
                          onChange={(e) =>
                            setCompanyProfile({
                              ...companyProfile,
                              dateTimeFormat: e.target.value,
                            })
                          }
                          className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                        >
                          {DATE_FORMATS.map((fmt) => (
                            <option key={fmt.value} value={fmt.value}>
                              {fmt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Holiday Calendar */}
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-600" />
                        <CardTitle className="text-base font-bold text-slate-900">
                          Official Holidays
                        </CardTitle>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsHolidayModalOpen(true)}
                        className="text-xs gap-1 border-orange-200 text-orange-600 hover:bg-orange-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Holiday</span>
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-3">
                      {companyProfile.holidays.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">
                          No company holidays added yet.
                        </p>
                      ) : (
                        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                          {companyProfile.holidays.map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center justify-between py-2 text-xs"
                            >
                              <div>
                                <p className="font-semibold text-slate-800">{h.name}</p>
                                <p className="text-[11px] text-slate-400 font-mono">{h.date}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveHoliday(h.id)}
                                title="Remove Holiday"
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Save Button */}
                  <Button
                    type="submit"
                    isLoading={isSaving}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md text-sm gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Company Configuration</span>
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 2: DEPARTMENT CONFIGURATION ⭐                                */}
          {/* ================================================================= */}
          {activeSubTab === 'departments' && (
            <div className="space-y-6">
              {/* Department Statistics Summary Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Total Departments</p>
                    <p className="text-xl font-bold text-slate-900">{departments.length}</p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Mapped Skills</p>
                    <p className="text-xl font-bold text-slate-900">
                      {Array.from(new Set(departments.flatMap((d) => d.skills))).length}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Issue Types</p>
                    <p className="text-xl font-bold text-slate-900">
                      {Array.from(new Set(departments.flatMap((d) => d.issueTypes))).length}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-semibold uppercase">Dept Heads / POC</p>
                    <p className="text-xl font-bold text-slate-900">
                      {departments.filter((d) => d.headUser).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Department Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {departments.map((dept) => (
                  <Card
                    key={dept.id}
                    className="border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                  >
                    {/* Header */}
                    <CardHeader className="bg-slate-50/70 pb-3 border-b border-slate-100 flex flex-row items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-bold text-slate-900">
                            {dept.name}
                          </CardTitle>
                          <span className="font-mono text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-bold border border-orange-200">
                            {dept.code}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              dept.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {dept.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {dept.description || 'General engineering and technical operations department.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditDepartmentModal(dept)}
                          title="Edit Department"
                          className="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                          title="Delete Department"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      {/* Section 1: Skills handled */}
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-orange-500" />
                          <span>Skills Handled ({dept.skills?.length || 0})</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {dept.skills && dept.skills.length > 0 ? (
                            dept.skills.map((skill) => (
                              <span
                                key={skill}
                                className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-medium border border-slate-200"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No skills mapped</span>
                          )}
                        </div>
                      </div>

                      {/* Section 2: Products & Services */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <p className="font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Package className="w-3 h-3 text-blue-500" />
                            <span>Products</span>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {dept.products?.map((p) => (
                              <span key={p} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="font-bold text-slate-700 mb-1 flex items-center gap-1">
                            <Layers className="w-3 h-3 text-emerald-500" />
                            <span>Services</span>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {dept.services?.map((s) => (
                              <span key={s} className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Query / Issue Types ⭐ */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                          <span>Handled Query / Issue Types ⭐</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {dept.issueTypes?.map((issue) => (
                            <span
                              key={issue}
                              className="text-[11px] bg-purple-50 text-purple-800 font-semibold px-2.5 py-0.5 rounded-md border border-purple-200"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Section 4: Department Head / POC inside department */}
                      <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-orange-600" />
                            <span>Department Head / POC</span>
                          </p>

                          {!dept.headUser && (
                            <Button
                              size="sm"
                              onClick={() => openInviteModalForDept(dept.name)}
                              className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-white gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Invite Head</span>
                            </Button>
                          )}
                        </div>

                        {dept.headUser ? (
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                                {dept.headUser.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">
                                  {dept.headUser.fullName}
                                </p>
                                <p className="text-[11px] text-slate-500">{dept.headUser.email}</p>
                              </div>
                            </div>

                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              Assigned
                            </span>
                          </div>
                        ) : (
                          <div className="mt-2 text-center py-2 bg-white/60 rounded-lg border border-dashed border-slate-300">
                            <p className="text-xs font-semibold text-slate-500">
                              No Department Head assigned
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Invite a POC to oversee technician assignment and SLA resolutions.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: DEPARTMENT HEAD MANAGEMENT                                 */}
          {/* ================================================================= */}
          {activeSubTab === 'heads' && (
            <div className="space-y-6">
              {/* Sub-Header Notice */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold">Department Scope & Deactivation Policy</p>
                  <p>
                    Department Heads hold operational governance over ticket queues and routing for their assigned department. When a head leaves or transfers, use <strong>Deactivate</strong> instead of deletion so that all historical ticket actions (e.g. <em>Ticket #TK-1024 Assigned & Closed by Rahul Sharma</em>) remain permanently auditable.
                  </p>
                </div>
              </div>

              {/* 1. Pending Invitations */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Pending Department Head Invitations
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      Secure invitation links dispatched to candidate Department Heads.
                    </p>
                  </div>
                  <Badge variant="warning" className="bg-orange-100 text-orange-800 font-mono text-xs">
                    {invitations.length} Pending
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {invitations.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No pending invitations. Click &quot;Invite Department Head&quot; to send an invitation.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {invitations.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-slate-900">
                                {inv.fullName || 'Department Candidate'}
                              </p>
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase">
                                Pending
                              </span>
                              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {inv.department || 'General'}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                              <span className="flex items-center gap-1 font-mono">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                {inv.email}
                              </span>
                              {inv.phone && (
                                <span className="flex items-center gap-1 font-mono">
                                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                                  {inv.phone}
                                </span>
                              )}
                              <span>
                                Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Invitation Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyInviteLink(inv)}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 transition-colors"
                            >
                              {copiedInviteId === inv.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-700 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleResendInvitation(inv.id, inv.email)}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 flex items-center gap-1 transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Resend</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRevokeInvitation(inv.id, inv.email)}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 flex items-center gap-1 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2. Active Department Heads & Staff */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900">
                    Active Department Heads & Team Members
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Manage active logins, change departmental assignment, and safely toggle active status.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="p-3.5 pl-5">Member Name</th>
                          <th className="p-3.5">Assigned Department</th>
                          <th className="p-3.5">Role / Scope</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Last Login</th>
                          <th className="p-3.5 pr-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {teamMembers.map((member) => {
                          const isCurrentUser = member.userId === user?.id || member.email.toLowerCase() === user?.email.toLowerCase();
                          return (
                            <tr key={member.userId} className="hover:bg-slate-50/50">
                              <td className="p-3.5 pl-5">
                                <div className="flex items-center gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-slate-900">{member.fullName}</p>
                                      {isCurrentUser && (
                                        <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.2 rounded border border-orange-200">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-slate-400 font-mono text-[11px]">{member.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <span className="font-semibold text-slate-800">
                                  {member.department || 'Maintenance Department'}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px] font-semibold text-slate-700">
                                  {member.role}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                    member.isActive
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {member.isActive ? 'Active' : 'Deactivated'}
                                </span>
                              </td>
                              <td className="p-3.5 text-slate-500">
                                {member.lastLoginAt
                                  ? new Date(member.lastLoginAt).toLocaleString()
                                  : 'Never'}
                              </td>
                              <td className="p-3.5 pr-5 text-right space-x-2">
                                {isCurrentUser ? (
                                  <span className="text-[11px] text-slate-400 font-semibold italic">
                                    Primary Admin
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handleToggleUserStatus(
                                        member.userId,
                                        member.isActive,
                                        member.fullName
                                      )
                                    }
                                    className={`text-[11px] h-7 ${
                                      member.isActive
                                        ? 'text-red-600 hover:bg-red-50 border-red-200'
                                        : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                                    }`}
                                  >
                                    {member.isActive ? 'Deactivate' : 'Reactivate'}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeSubTab === 'categories' && (
            <ServiceCategoriesTab
              categories={serviceCategories}
              priorities={priorities}
              onSaveCategories={handleSaveCategories}
              onSavePriorities={handleSavePriorities}
              isSaving={isSaving}
            />
          )}

          {activeSubTab === 'rules' && (
            <TicketAssignmentRulesTab
              rules={assignmentRules}
              departments={departments.map((d) => ({ id: d.id, name: d.name }))}
              categories={serviceCategories}
              priorities={priorities}
              onSaveRules={handleSaveAssignmentRules}
              isSaving={isSaving}
            />
          )}

          {activeSubTab === 'email' && (
            <EmailConfigurationTab />
          )}
        </>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD / EDIT DEPARTMENT                                        */}
      {/* ===================================================================== */}
      <Dialog
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={editingDeptId ? 'Edit Department Scope' : 'Add New Department ⭐'}
        description="Configure department identity, technical skill capabilities, handled products/services, and issue types."
      >
        <form onSubmit={handleSaveDepartment} className="space-y-4 mt-3 max-h-[75vh] overflow-y-auto pr-2">
          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              id="modal-dept-name"
              label="Department Name"
              required
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              placeholder="e.g. Maintenance Department"
            />
            <Input
              id="modal-dept-code"
              label="Department Code"
              required
              value={deptCode}
              onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
              placeholder="e.g. MAINT"
              helperText="Uppercase alphanumeric prefix"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Scope
            </label>
            <textarea
              rows={2}
              value={deptDescription}
              onChange={(e) => setDeptDescription(e.target.value)}
              placeholder="Responsibilities, machine clusters, and operational scope..."
              className="w-full text-xs rounded-lg border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Status Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Department Status
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeptStatus('ACTIVE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
                  deptStatus === 'ACTIVE'
                    ? 'bg-emerald-500 text-white border-emerald-600'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setDeptStatus('INACTIVE')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
                  deptStatus === 'INACTIVE'
                    ? 'bg-red-500 text-white border-red-600'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* 1. Skills Handled */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Skills Handled by Department</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {selectedSkills.length} selected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_SKILLS.map((skill) => {
                const isChecked = selectedSkills.includes(skill);
                return (
                  <label
                    key={skill}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                      isChecked
                        ? 'bg-orange-50 border-orange-200 text-orange-950 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(setSelectedSkills, skill)}
                      className="rounded text-orange-600 focus:ring-orange-500"
                    />
                    <span>{skill}</span>
                  </label>
                );
              })}
            </div>
            {/* Custom Skill Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                placeholder="+ Add custom skill tag..."
                className="flex-1 text-xs rounded-lg border border-slate-200 p-2 bg-white"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  addCustomItem(customSkillInput, setCustomSkillInput, setSelectedSkills)
                }
              >
                Add
              </Button>
            </div>
          </div>

          {/* 2. Products Handled */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Products Handled</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {selectedProducts.length} selected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_PRODUCTS.map((prod) => {
                const isChecked = selectedProducts.includes(prod);
                return (
                  <label
                    key={prod}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                      isChecked
                        ? 'bg-blue-50 border-blue-200 text-blue-950 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(setSelectedProducts, prod)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{prod}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customProductInput}
                onChange={(e) => setCustomProductInput(e.target.value)}
                placeholder="+ Add custom product..."
                className="flex-1 text-xs rounded-lg border border-slate-200 p-2 bg-white"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  addCustomItem(customProductInput, setCustomProductInput, setSelectedProducts)
                }
              >
                Add
              </Button>
            </div>
          </div>

          {/* 3. Services Handled */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Services Handled</span>
              <span className="text-[11px] text-slate-500 font-normal">
                {selectedServices.length} selected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_SERVICES.map((serv) => {
                const isChecked = selectedServices.includes(serv);
                return (
                  <label
                    key={serv}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(setSelectedServices, serv)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{serv}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customServiceInput}
                onChange={(e) => setCustomServiceInput(e.target.value)}
                placeholder="+ Add custom service..."
                className="flex-1 text-xs rounded-lg border border-slate-200 p-2 bg-white"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  addCustomItem(customServiceInput, setCustomServiceInput, setSelectedServices)
                }
              >
                Add
              </Button>
            </div>
          </div>

          {/* 4. Query / Issue Types Handled ⭐ */}
          <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200 space-y-2">
            <div className="text-xs font-bold text-purple-900 flex items-center justify-between">
              <span>Queries / Issue Types Handled ⭐</span>
              <span className="text-[11px] text-purple-600 font-semibold">
                {selectedIssueTypes.length} selected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEFAULT_ISSUE_TYPES.map((issue) => {
                const isChecked = selectedIssueTypes.includes(issue);
                return (
                  <label
                    key={issue}
                    className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition-colors ${
                      isChecked
                        ? 'bg-purple-100 border-purple-300 text-purple-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(setSelectedIssueTypes, issue)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>{issue}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customIssueTypeInput}
                onChange={(e) => setCustomIssueTypeInput(e.target.value)}
                placeholder="+ Add custom issue type..."
                className="flex-1 text-xs rounded-lg border border-slate-200 p-2 bg-white"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  addCustomItem(customIssueTypeInput, setCustomIssueTypeInput, setSelectedIssueTypes)
                }
              >
                Add
              </Button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeptModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              Save Department Configuration
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL 2: INVITE DEPARTMENT HEAD / POC                                 */}
      {/* ===================================================================== */}
      <Dialog
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Department Head / POC"
        description="Send a secure single-use invitation to appoint an operational Department Head."
      >
        <form onSubmit={handleSendInvitation} className="space-y-4 mt-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Department (Scope Locked)
            </label>
            <select
              value={inviteDeptName}
              onChange={(e) => setInviteDeptName(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 font-bold text-slate-800 focus:outline-none"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Backend strictly enforces departmental scope. The invitee cannot alter their assigned department.
            </p>
          </div>

          <Input
            id="invite-fullname"
            label="Full Name"
            required
            value={inviteFullName}
            onChange={(e) => setInviteFullName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
          />

          <Input
            id="invite-email"
            label="Official Work Email"
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="rahul@abc.com"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              id="invite-phone"
              label="Contact Phone"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
            <Input
              id="invite-designation"
              label="Designation / Title"
              value={inviteDesignation}
              onChange={(e) => setInviteDesignation(e.target.value)}
              placeholder="e.g. Head of Maintenance"
            />
          </div>

          <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-xs text-orange-950 flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-600 shrink-0" />
            <span>
              Role granted: <strong>DEPARTMENT_ADMIN</strong> (Pre-configured with ticket allocation & resolution rights).
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsInviteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isSaving}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send Invitation</span>
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL 3: ADD HOLIDAY                                                  */}
      {/* ===================================================================== */}
      <Dialog
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Add Company Holiday"
        description="Add scheduled holidays to exclude them from SLA calculation timers."
      >
        <div className="space-y-4 mt-3">
          <Input
            id="holiday-name"
            label="Holiday Occasion / Name"
            required
            value={newHolidayName}
            onChange={(e) => setNewHolidayName(e.target.value)}
            placeholder="e.g. Ganesh Chaturthi"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Holiday Date
            </label>
            <input
              type="date"
              required
              value={newHolidayDate}
              onChange={(e) => setNewHolidayDate(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsHolidayModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddHoliday}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold"
            >
              Add Holiday
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODAL 4: INVITATION DISPATCHED CONFIRMATION (DIRECT LINK)             */}
      {/* ===================================================================== */}
      <Dialog
        isOpen={!!sentInviteModalData}
        onClose={() => setSentInviteModalData(null)}
        title="Department Head Invitation Dispatched!"
        description="A real invitation has been created. The candidate can open or activate their login using the secure link below."
      >
        {sentInviteModalData && (
          <div className="space-y-4 mt-3">
            <div className="p-4 bg-orange-50/70 rounded-xl border border-orange-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Invitee:</span>
                <span className="font-bold text-slate-900">{sentInviteModalData.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Work Email:</span>
                <span className="font-mono text-slate-800">{sentInviteModalData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Department:</span>
                <span className="font-bold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded border border-orange-200">
                  {sentInviteModalData.department}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Role:</span>
                <span className="font-bold text-slate-900">Department Head (DEPARTMENT_ADMIN)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Single-Use Activation Link</span>
                <span className="text-[10px] text-slate-400 font-normal">Valid for 7 days</span>
              </label>
              <div className="p-2.5 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg break-all select-all">
                {sentInviteModalData.inviteUrl}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                💡 <em>Testing Tip:</em> If you haven't configured an external outbound SMTP email server in <code>.env</code>, you can open this link directly in an incognito window to complete password setup and activate the account!
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(sentInviteModalData.inviteUrl);
                  setFeedback({ type: 'success', text: 'Activation link copied to clipboard!' });
                }}
                className="gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Link</span>
              </Button>
              <a
                href={sentInviteModalData.inviteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-1.5">
                  <span>Open Link to Test</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
