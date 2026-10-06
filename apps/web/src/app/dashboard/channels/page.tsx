'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  Phone,
  Mail,
  MessageSquare,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ShieldCheck,
  Copy,
  Check,
  Send,
  Save,
  RefreshCw,
  Play,
  ArrowRight,
  Code2,
  Sparkles,
  Sliders,
  Radio,
  UserCheck,
  Headphones,
  Paperclip,
  CheckSquare,
  Square,
  Eye,
  Settings2,
} from 'lucide-react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface ChannelPhoneConfig {
  enabled: boolean;
  status: 'CONNECTED' | 'INACTIVE';
  supportNumber: string;
  defaultDepartmentId: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  workingDays: string[];
  afterHoursPolicy: 'VOICEMAIL_TRANSCRIPT' | 'EMERGENCY_IVR' | 'SMS_CALLBACK';
  afterHoursGreeting: string;
  createTicketOnMissedCall: boolean;
  autoRecordAudio: boolean;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

interface ChannelEmailConfig {
  enabled: boolean;
  status: 'CONNECTED' | 'INACTIVE';
  supportEmail: string;
  provider: 'KALPAK_MANAGED' | 'GOOGLE_WORKSPACE' | 'MICROSOFT_365' | 'CUSTOM_IMAP_SMTP';
  defaultDepartmentId: string;
  autoTicketCreation: boolean;
  threadingEnabled: boolean;
  threadingWindowDays: number;
  autoAckEnabled: boolean;
  autoAckSubject: string;
  autoAckBody: string;
  spamFilterThreshold: number;
}

interface ChannelWhatsConfig {
  enabled: boolean;
  status: 'CONNECTED' | 'INACTIVE';
  businessNumber: string;
  wabaId: string;
  apiProvider: 'META_CLOUD_API' | 'TWILIO_WHATSAPP' | 'GUPSHUP';
  defaultDepartmentId: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  autoReplyEnabled: boolean;
  welcomeMessage: string;
  outOfHoursMessage: string;
  messageToTicketRule: 'AUTO_ALL_MESSAGES' | 'KEYWORD_OR_PROMPT' | 'INTERACTIVE_MENU';
  sessionWindowHours: number;
  attachMediaToTicket: boolean;
}

interface ChannelWebsiteConfig {
  enabled: boolean;
  status: 'CONNECTED' | 'INACTIVE';
  widgetTitle: string;
  welcomeGreeting: string;
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  showLogo: boolean;
  customLogoUrl: string;
  defaultDepartmentId: string;
  categories: string[];
  fields: {
    customerName: boolean;
    email: boolean;
    phone: boolean;
    assetSerial: boolean;
    serviceCategory: boolean;
    priority: boolean;
    attachments: boolean;
  };
  customerIdentification: 'MATCH_EMAIL_PHONE_OR_CREATE' | 'EXISTING_ONLY' | 'GUEST_TICKET';
  autoAckEnabled: boolean;
  autoAckScreenMessage: string;
}

interface CustomerChannelsState {
  phone: ChannelPhoneConfig;
  email: ChannelEmailConfig;
  whatsapp: ChannelWhatsConfig;
  website: ChannelWebsiteConfig;
}

const DEFAULT_CHANNELS: CustomerChannelsState = {
  phone: {
    enabled: true,
    status: 'CONNECTED',
    supportNumber: '+91 1800-200-5599',
    defaultDepartmentId: '',
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    afterHoursPolicy: 'VOICEMAIL_TRANSCRIPT',
    afterHoursGreeting: 'Thank you for calling. Our offices are currently closed. Please leave your machine details and contact number, and our on-call engineer will create ticket automatically.',
    createTicketOnMissedCall: true,
    autoRecordAudio: true,
    defaultPriority: 'HIGH',
  },
  email: {
    enabled: true,
    status: 'CONNECTED',
    supportEmail: 'support@acme-corp.kalpaksolutions.com',
    provider: 'KALPAK_MANAGED',
    defaultDepartmentId: '',
    autoTicketCreation: true,
    threadingEnabled: true,
    threadingWindowDays: 14,
    autoAckEnabled: true,
    autoAckSubject: '[Kalpak #{ticket_number}] We received your service request: {ticket_title}',
    autoAckBody: 'Hello {{customer_name}},\n\nThank you for reaching out to customer support. Your service request has been registered under Ticket ID #{{ticket_number}}.\n\nAssigned Department: {{department}}\nSLA Response Target: {{sla_target}}\n\nOur certified support technician will review your request and get back to you shortly.\n\nYou can reply directly to this email to add updates or attach diagnostic files.\n\nBest regards,\nCustomer Support Team',
    spamFilterThreshold: 85,
  },
  whatsapp: {
    enabled: true,
    status: 'CONNECTED',
    businessNumber: '+91 98765 43210',
    wabaId: 'waba_99182746219',
    apiProvider: 'META_CLOUD_API',
    defaultDepartmentId: '',
    businessHoursStart: '09:00',
    businessHoursEnd: '18:00',
    autoReplyEnabled: true,
    welcomeMessage: '👋 Welcome to Customer Support! Your query has been logged as Ticket #{{ticket_number}}. A service engineer has been notified.',
    outOfHoursMessage: '🌙 We are currently outside standard business hours (Mon-Fri 9:00 AM - 6:00 PM). Your issue has been recorded as Ticket #{{ticket_number}} and will be addressed first thing in the morning.',
    messageToTicketRule: 'AUTO_ALL_MESSAGES',
    sessionWindowHours: 24,
    attachMediaToTicket: true,
  },
  website: {
    enabled: true,
    status: 'CONNECTED',
    widgetTitle: 'Customer Service & Help Desk',
    welcomeGreeting: 'Raise a breakdown request, order parts, or ask an engineering question.',
    primaryColor: '#f97316',
    position: 'bottom-right',
    showLogo: true,
    customLogoUrl: '',
    defaultDepartmentId: '',
    categories: ['Breakdown / Machine Down', 'Preventive Maintenance', 'Parts & Spares Request', 'Calibration / Commissioning', 'General Technical Query'],
    fields: {
      customerName: true,
      email: true,
      phone: true,
      assetSerial: true,
      serviceCategory: true,
      priority: true,
      attachments: true,
    },
    customerIdentification: 'MATCH_EMAIL_PHONE_OR_CREATE',
    autoAckEnabled: true,
    autoAckScreenMessage: 'Your service request has been logged successfully! Ticket #{ticket_number} has been created and assigned to our service engineers.',
  },
};

export default function CustomerChannelsPage() {
  const { activeTenant } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'phone' | 'email' | 'whatsapp' | 'website'>('overview');
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [channels, setChannels] = useState<CustomerChannelsState>(DEFAULT_CHANNELS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Test Connection Simulator States
  const [testModalChannel, setTestModalChannel] = useState<'phone' | 'email' | 'whatsapp' | 'website' | null>(null);
  const [testPayload, setTestPayload] = useState({
    customerPhone: '+91 98220 12345',
    customerEmail: 'maintenance@apexprecision.com',
    customerName: 'Apex Precision Engineering',
    queryText: 'CNC Grinder hydraulic pressure dropping rapidly below 40 bar',
    subject: 'Emergency: Machine unit #3 abnormal vibrations',
    ticketReference: '',
  });
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    stageLog: string[];
    ticketNumber?: string;
    routedDepartment?: string;
    sourceTag?: string;
  } | null>(null);

  // Load Tenant Customer Channels & Departments
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tenantData, deptsData] = await Promise.all([
        apiClient<any>('/tenants/current'),
        apiClient<DepartmentOption[]>('/departments').catch(() => []),
      ]);

      setDepartments(deptsData || []);

      const savedChannels = tenantData?.settings?.customerChannels;
      if (savedChannels) {
        setChannels({
          phone: { ...DEFAULT_CHANNELS.phone, ...(savedChannels.phone || {}) },
          email: { ...DEFAULT_CHANNELS.email, ...(savedChannels.email || {}) },
          whatsapp: { ...DEFAULT_CHANNELS.whatsapp, ...(savedChannels.whatsapp || {}) },
          website: { ...DEFAULT_CHANNELS.website, ...(savedChannels.website || {}) },
        });
      } else {
        if (deptsData && deptsData.length > 0 && deptsData[0]) {
          const firstDeptId = deptsData[0].id;
          setChannels((prev) => ({
            phone: { ...prev.phone, defaultDepartmentId: prev.phone.defaultDepartmentId || firstDeptId },
            email: { ...prev.email, defaultDepartmentId: prev.email.defaultDepartmentId || firstDeptId },
            whatsapp: { ...prev.whatsapp, defaultDepartmentId: prev.whatsapp.defaultDepartmentId || firstDeptId },
            website: { ...prev.website, defaultDepartmentId: prev.website.defaultDepartmentId || firstDeptId },
          }));
        }
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to fetch customer channels configuration',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Save Settings handler
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setFeedback(null);

      await apiClient('/tenants/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          customerChannels: channels,
        }),
      });

      setFeedback({
        type: 'success',
        message: 'Customer communication channels updated and deployed to Kalpak Ticket Engine successfully.',
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save channels configuration',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle channel on/off
  const toggleChannel = (channelKey: keyof CustomerChannelsState) => {
    setChannels((prev) => ({
      ...prev,
      [channelKey]: {
        ...prev[channelKey],
        enabled: !prev[channelKey].enabled,
        status: !prev[channelKey].enabled ? 'CONNECTED' : 'INACTIVE',
      },
    }));
  };

  // Run Test Connection Simulator
  const handleRunTest = async (channel: 'phone' | 'email' | 'whatsapp' | 'website') => {
    setTestRunning(true);
    setTestResult(null);

    const targetDept = departments.find(
      (d) => d.id === channels[channel].defaultDepartmentId
    ) || departments[0] || { name: 'Customer Engineering', code: 'ENGG' };

    const simulatedTicketNum = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;

    setTimeout(() => {
      setTestResult({
        success: true,
        ticketNumber: simulatedTicketNum,
        routedDepartment: `${targetDept.name} (${targetDept.code})`,
        sourceTag: channel.toUpperCase(),
        stageLog: [
          `[1/5] Inbound ${channel.toUpperCase()} webhook ping received from gateway`,
          `[2/5] Verified Tenant Authorization -> ${activeTenant?.name || 'Acme Corp'} (${activeTenant?.slug || 'acme-corp'})`,
          `[3/5] Customer Identification -> matched "${testPayload.customerName}" (${channel === 'email' ? testPayload.customerEmail : testPayload.customerPhone})`,
          `[4/5] Department Routing Matrix -> resolved to "${targetDept.name}"`,
          `[5/5] Kalpak Ticket Engine Created Ticket #${simulatedTicketNum} with Source = "${channel.toUpperCase()}"`,
          `[OK] Auto-acknowledgement dispatched via ${channel.toUpperCase()} channel`,
        ],
      });
      setTestRunning(false);
    }, 1200);
  };

  // Generated Embed Code for Website
  const tenantSlug = activeTenant?.slug || 'acme-corp';
  const embedCodeSnippet = useMemo(() => {
    return `<!-- Kalpak Solutions Customer Support Form & Widget -->
<script
  src="https://cdn.kalpaksolutions.com/v2/widget.js"
  data-tenant="${tenantSlug}"
  data-primary-color="${channels.website.primaryColor}"
  data-position="${channels.website.position}"
  data-title="${channels.website.widgetTitle}"
  async defer>
</script>
<div id="kalpak-support-widget" data-tenant="${tenantSlug}"></div>`;
  }, [tenantSlug, channels.website]);

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCodeSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <RefreshCw className="w-8 h-8 text-orange-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading Customer Channels Configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">Customer Communication Channels</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Multi-Tenant Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure how <strong>your customers</strong> raise breakdown, maintenance, and service queries via Phone, Email, WhatsApp, and Website.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTestModalChannel('phone');
                setTestResult(null);
              }}
              className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900"
            >
              <Play className="w-3.5 h-3.5 text-orange-600" />
              Test Inbound Ingestion
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 text-xs shadow-xs"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Saving Configuration...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Channel Matrix
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Multi-Tenant Security Info Ribbon */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Tenant Scoping: <strong className="text-slate-900">{activeTenant?.name || 'Acme Corporation'}</strong> (<code className="font-mono text-[11px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{activeTenant?.slug || 'acme-corp'}</code>). Configuration & customer interactions are strictly isolated.
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 shrink-0">
            <span>Departments Available: <strong>{departments.length}</strong></span>
            <span>•</span>
            <span>Ticket Engine: <strong>Kalpak v2.4 Multi-Source</strong></span>
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in-50 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Channel Summary Grid (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Phone Card */}
        <div
          onClick={() => setActiveTab('phone')}
          className={`cursor-pointer rounded-2xl border p-4.5 transition-all bg-white hover:border-orange-300 hover:shadow-xs relative ${
            activeTab === 'phone' ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-xs' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  channels.phone.enabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {channels.phone.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
          </div>
          <h2 className="text-base font-bold text-slate-900">Phone Support</h2>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">Inbound IVR & Call-to-Ticket</p>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Hotline:</span>
              <span className="font-mono font-medium text-slate-800">{channels.phone.supportNumber || 'Not set'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Routing:</span>
              <span className="font-medium text-slate-800 truncate max-w-[120px]">
                {departments.find((d) => d.id === channels.phone.defaultDepartmentId)?.name || 'Default Dept'}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>After-Hours:</span>
              <span className="text-slate-700 font-medium">Voicemail Transcription</span>
            </div>
          </div>
        </div>

        {/* Email Card */}
        <div
          onClick={() => setActiveTab('email')}
          className={`cursor-pointer rounded-2xl border p-4.5 transition-all bg-white hover:border-orange-300 hover:shadow-xs relative ${
            activeTab === 'email' ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-xs' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  channels.email.enabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {channels.email.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
          </div>
          <h2 className="text-base font-bold text-slate-900">Email Ingestion</h2>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">Inbound Parser & Smart Threading</p>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Address:</span>
              <span className="font-mono font-medium text-slate-800 truncate max-w-[120px]">{channels.email.supportEmail}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Threading:</span>
              <span className="font-medium text-emerald-700">Auto [TCK-xxxx]</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Auto-Ack:</span>
              <span className="text-slate-700 font-medium">{channels.email.autoAckEnabled ? 'Enabled' : 'Off'}</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Card */}
        <div
          onClick={() => setActiveTab('whatsapp')}
          className={`cursor-pointer rounded-2xl border p-4.5 transition-all bg-white hover:border-orange-300 hover:shadow-xs relative ${
            activeTab === 'whatsapp' ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-xs' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  channels.whatsapp.enabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {channels.whatsapp.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
          </div>
          <h2 className="text-base font-bold text-slate-900">WhatsApp Business</h2>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">Meta Cloud API & Auto-Chat</p>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>WABA Number:</span>
              <span className="font-mono font-medium text-slate-800">{channels.whatsapp.businessNumber}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Session Window:</span>
              <span className="font-medium text-slate-800">24 Hours</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Media Attach:</span>
              <span className="text-emerald-700 font-medium">Photos & Videos</span>
            </div>
          </div>
        </div>

        {/* Website Card */}
        <div
          onClick={() => setActiveTab('website')}
          className={`cursor-pointer rounded-2xl border p-4.5 transition-all bg-white hover:border-orange-300 hover:shadow-xs relative ${
            activeTab === 'website' ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-xs' : 'border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  channels.website.enabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {channels.website.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
          </div>
          <h2 className="text-base font-bold text-slate-900">Website Widget</h2>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">Embeddable Support Form</p>
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Placement:</span>
              <span className="font-medium text-slate-800 capitalize">{channels.website.position.replace('-', ' ')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Custom Brand:</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: channels.website.primaryColor }} />
                <span className="font-mono text-slate-700">{channels.website.primaryColor}</span>
              </div>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Embed Snippet:</span>
              <span className="text-indigo-600 font-medium">Ready (v2.4)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Ticket Creation Flow Diagram (Collapsible / Visual Banner) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 border border-slate-700 shadow-sm overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/80 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white uppercase">Unified Ticket Creation Architecture</h2>
              <p className="text-xs text-slate-300">
                Regardless of the inbound channel, all customer interactions pass through the Kalpak Ticket Engine and are stamped with their exact source.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-slate-800 text-orange-400 border border-slate-700 px-2.5 py-1 rounded-md">
              Source Stamping: PHONE | EMAIL | WHATSAPP | WEBSITE | PORTAL | MANUAL
            </span>
          </div>
        </div>

        {/* Visual Pipeline Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center text-xs">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex flex-col items-center justify-center space-y-1">
            <div className="flex items-center gap-1 text-orange-400 font-bold">
              <Phone className="w-3.5 h-3.5" />
              <Mail className="w-3.5 h-3.5" />
              <MessageSquare className="w-3.5 h-3.5" />
              <Globe className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-100">1. Customer Inbound</span>
            <span className="text-[10px] text-slate-400">Phone/Email/WA/Web</span>
          </div>

          <div className="hidden md:flex items-center justify-center text-slate-500">
            <ArrowRight className="w-5 h-5 text-orange-400" />
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex flex-col items-center justify-center space-y-1">
            <Radio className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-100">2. Kalpak Engine</span>
            <span className="text-[10px] text-slate-400">Tenant & Auth Filter</span>
          </div>

          <div className="hidden md:flex items-center justify-center text-slate-500">
            <ArrowRight className="w-5 h-5 text-orange-400" />
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex flex-col items-center justify-center space-y-1">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-100">3. Match Customer</span>
            <span className="text-[10px] text-slate-400">Phone / Email Match</span>
          </div>

          <div className="hidden md:flex items-center justify-center text-slate-500">
            <ArrowRight className="w-5 h-5 text-orange-400" />
          </div>

          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex flex-col items-center justify-center space-y-1">
            <Layers className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-slate-100">4. Route & Assign</span>
            <span className="text-[10px] text-slate-400">Dept Head → Tech</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Channels Overview & Rules
        </button>
        <button
          onClick={() => setActiveTab('phone')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'phone'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Phone className="w-4 h-4" />
          📞 Phone Support
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'email'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mail className="w-4 h-4" />
          📧 Email Ingestion
        </button>
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'whatsapp'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          💬 WhatsApp Business
        </button>
        <button
          onClick={() => setActiveTab('website')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'website'
              ? 'border-orange-500 text-orange-600 bg-orange-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          🌐 Website Widget & Embed
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: OVERVIEW & MULTI-CHANNEL ROUTING MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inbound Channel Status & Department Routing Matrix</CardTitle>
              <CardDescription>
                Enable or disable specific customer access paths and view default department routing assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {/* Phone row */}
                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Phone Hotlines</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          Source: PHONE
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Configured: <strong className="text-slate-800">{channels.phone.supportNumber || 'None'}</strong> • After-hours: {channels.phone.afterHoursPolicy}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-right hidden sm:block">
                      <span className="text-slate-500">Routes to:</span>{' '}
                      <strong className="text-slate-800">
                        {departments.find((d) => d.id === channels.phone.defaultDepartmentId)?.name || 'Default Department'}
                      </strong>
                    </div>
                    <Button
                      variant={channels.phone.enabled ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={() => toggleChannel('phone')}
                      className="text-xs"
                    >
                      {channels.phone.enabled ? 'Disable Channel' : 'Enable Channel'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveTab('phone')}
                      className="text-xs"
                    >
                      Configure
                    </Button>
                  </div>
                </div>

                {/* Email row */}
                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Support Email Parsing</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          Source: EMAIL
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Inbound address: <strong className="text-slate-800">{channels.email.supportEmail}</strong> • Threading: {channels.email.threadingEnabled ? 'Active' : 'Off'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-right hidden sm:block">
                      <span className="text-slate-500">Routes to:</span>{' '}
                      <strong className="text-slate-800">
                        {departments.find((d) => d.id === channels.email.defaultDepartmentId)?.name || 'Default Department'}
                      </strong>
                    </div>
                    <Button
                      variant={channels.email.enabled ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={() => toggleChannel('email')}
                      className="text-xs"
                    >
                      {channels.email.enabled ? 'Disable Channel' : 'Enable Channel'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveTab('email')}
                      className="text-xs"
                    >
                      Configure
                    </Button>
                  </div>
                </div>

                {/* WhatsApp row */}
                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">WhatsApp Business Service</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          Source: WHATSAPP
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        WhatsApp Number: <strong className="text-slate-800">{channels.whatsapp.businessNumber}</strong> • Provider: {channels.whatsapp.apiProvider}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-right hidden sm:block">
                      <span className="text-slate-500">Routes to:</span>{' '}
                      <strong className="text-slate-800">
                        {departments.find((d) => d.id === channels.whatsapp.defaultDepartmentId)?.name || 'Default Department'}
                      </strong>
                    </div>
                    <Button
                      variant={channels.whatsapp.enabled ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={() => toggleChannel('whatsapp')}
                      className="text-xs"
                    >
                      {channels.whatsapp.enabled ? 'Disable Channel' : 'Enable Channel'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveTab('whatsapp')}
                      className="text-xs"
                    >
                      Configure
                    </Button>
                  </div>
                </div>

                {/* Website row */}
                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Official Website Widget & Form</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          Source: WEBSITE
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Embed: <strong className="text-slate-800">{channels.website.position}</strong> • Attachments: {channels.website.fields.attachments ? 'Allowed' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-right hidden sm:block">
                      <span className="text-slate-500">Routes to:</span>{' '}
                      <strong className="text-slate-800">
                        {departments.find((d) => d.id === channels.website.defaultDepartmentId)?.name || 'Default Department'}
                      </strong>
                    </div>
                    <Button
                      variant={channels.website.enabled ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={() => toggleChannel('website')}
                      className="text-xs"
                    >
                      {channels.website.enabled ? 'Disable Channel' : 'Enable Channel'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setActiveTab('website')}
                      className="text-xs"
                    >
                      Configure
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: 📞 PHONE CHANNEL CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'phone' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">📞 Phone Support Configuration</CardTitle>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      channels.phone.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {channels.phone.enabled ? 'Channel Enabled' : 'Channel Disabled'}
                  </span>
                </div>
                <CardDescription>
                  Configure incoming support hotline, IVR rules, operating hours, and automatic call-to-ticket conversion.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleChannel('phone')}
                className="text-xs shrink-0"
              >
                {channels.phone.enabled ? 'Disable Channel' : 'Enable Channel'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Core Phone Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Company Support Phone Number / Hotline
                  </label>
                  <Input
                    value={channels.phone.supportNumber}
                    onChange={(e) =>
                      setChannels((prev) => ({
                        ...prev,
                        phone: { ...prev.phone, supportNumber: e.target.value },
                      }))
                    }
                    placeholder="+91 1800-200-5599 or +91 9876543210"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Customers calling this number are prompted with your IVR and matched against registered accounts.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Default Department Routing
                  </label>
                  <select
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                    value={channels.phone.defaultDepartmentId}
                    onChange={(e) =>
                      setChannels((prev) => ({
                        ...prev,
                        phone: { ...prev.phone, defaultDepartmentId: e.target.value },
                      }))
                    }
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Default department where phone-created tickets are routed unless caller specifies a different code.
                  </p>
                </div>
              </div>

              {/* Business Hours & Working Days */}
              <div className="p-4.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>Business Hours & Call Routing Schedule</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Daily Support Start Time</label>
                    <Input
                      type="time"
                      value={channels.phone.businessHoursStart}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          phone: { ...prev.phone, businessHoursStart: e.target.value },
                        }))
                      }
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Daily Support End Time</label>
                    <Input
                      type="time"
                      value={channels.phone.businessHoursEnd}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          phone: { ...prev.phone, businessHoursEnd: e.target.value },
                        }))
                      }
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Default Ticket Priority</label>
                    <select
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                      value={channels.phone.defaultPriority}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          phone: { ...prev.phone, defaultPriority: e.target.value as any },
                        }))
                      }
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority (Recommended for Calls)</option>
                      <option value="URGENT">Urgent / Critical Breakdown</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* After-Hours Handling */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">After-Hours Handling & Voicemail</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Action When Customer Calls Outside Business Hours
                    </label>
                    <select
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                      value={channels.phone.afterHoursPolicy}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          phone: { ...prev.phone, afterHoursPolicy: e.target.value as any },
                        }))
                      }
                    >
                      <option value="VOICEMAIL_TRANSCRIPT">
                        Record Voicemail & Transcribe into Service Ticket
                      </option>
                      <option value="EMERGENCY_IVR">
                        Emergency On-Call Escalation IVR (Press 9 for Emergency)
                      </option>
                      <option value="SMS_CALLBACK">
                        Play Closed Prompt & Dispatch Instant SMS Callback Link
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      After-Hours Audio Greeting Prompt
                    </label>
                    <textarea
                      rows={3}
                      value={channels.phone.afterHoursGreeting}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          phone: { ...prev.phone, afterHoursGreeting: e.target.value },
                        }))
                      }
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Call-to-Ticket Settings */}
              <div className="p-4.5 rounded-xl border border-slate-200 bg-white space-y-3">
                <h2 className="text-sm font-bold text-slate-900">Call-to-Ticket Automation Settings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.phone.createTicketOnMissedCall}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          phone: { ...prev.phone, createTicketOnMissedCall: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span>Automatically create a high-priority ticket on <strong>abandoned / missed calls</strong></span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.phone.autoRecordAudio}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          phone: { ...prev.phone, autoRecordAudio: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span>Attach audio call recording to the ticket timeline</span>
                  </label>
                </div>
              </div>

              {/* Test Phone Connection Simulator */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    <Headphones className="w-4 h-4 text-blue-600" />
                    Test Phone Inbound Simulator
                  </h2>
                  <p className="text-xs text-blue-800 mt-0.5">
                    Simulate an incoming phone call to verify customer lookup, department routing, and ticket creation source tagging.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setTestModalChannel('phone');
                    handleRunTest('phone');
                  }}
                  className="shrink-0 text-xs shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Test Inbound Call Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 📧 EMAIL CHANNEL CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">📧 Email-to-Ticket Ingestion</CardTitle>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      channels.email.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {channels.email.enabled ? 'Channel Enabled' : 'Channel Disabled'}
                  </span>
                </div>
                <CardDescription>
                  Configure incoming support email addresses, threading rules, auto-acknowledgement emails, and provider integrations.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleChannel('email')}
                className="text-xs shrink-0"
              >
                {channels.email.enabled ? 'Disable Channel' : 'Enable Channel'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Official Inbound Support Email Address
                  </label>
                  <Input
                    value={channels.email.supportEmail}
                    onChange={(e) =>
                      setChannels((prev) => ({
                        ...prev,
                        email: { ...prev.email, supportEmail: e.target.value },
                      }))
                    }
                    placeholder="support@acmecorp.com"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Emails sent to this address are automatically parsed into tickets. Forwarding from Google Workspace or M365 is supported.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Default Department Routing
                  </label>
                  <select
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                    value={channels.email.defaultDepartmentId}
                    onChange={(e) =>
                      setChannels((prev) => ({
                        ...prev,
                        email: { ...prev.email, defaultDepartmentId: e.target.value },
                      }))
                    }
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Incoming emails without special routing tags will automatically route to this department.
                  </p>
                </div>
              </div>

              {/* Email Provider Integration Mode */}
              <div className="p-4.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Settings2 className="w-4 h-4 text-orange-600" />
                  <span>Email Provider & Integration Mode</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'KALPAK_MANAGED', label: 'Kalpak Cloud Inbound', desc: 'Zero config; managed cloud webhook' },
                    { id: 'GOOGLE_WORKSPACE', label: 'Google Workspace', desc: 'OAuth forwarding & Gmail API' },
                    { id: 'MICROSOFT_365', label: 'Microsoft 365 Exchange', desc: 'Azure AD App & Graph Ingestion' },
                    { id: 'CUSTOM_IMAP_SMTP', label: 'Custom IMAP / SMTP', desc: 'Self-hosted corporate mailboxes' },
                  ].map((prov) => (
                    <div
                      key={prov.id}
                      onClick={() =>
                        setChannels((prev) => ({
                          ...prev,
                          email: { ...prev.email, provider: prov.id as any },
                        }))
                      }
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        channels.email.provider === prov.id
                          ? 'border-orange-500 bg-orange-50/40 text-orange-950 font-bold'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs">{prov.label}</span>
                        {channels.email.provider === prov.id && (
                          <CheckCircle2 className="w-4 h-4 text-orange-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-normal mt-1">{prov.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Threading Rules */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Smart Email-to-Ticket Threading
                  </h2>
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    Regex Pattern: [TCK-#####]
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Customer emails and replies must be linked to the correct existing ticket whenever possible.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer p-3 rounded-lg border border-slate-200 bg-white">
                    <input
                      type="checkbox"
                      checked={channels.email.threadingEnabled}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          email: { ...prev.email, threadingEnabled: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span>
                      Enable <strong>In-Reply-To & Subject Regex Threading</strong> (appends replies to ticket timeline without creating duplicate tickets)
                    </span>
                  </label>

                  <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-3">
                    <div>
                      <span className="block text-xs font-medium text-slate-800">Thread Reopening Window</span>
                      <span className="text-[11px] text-slate-500">Days after resolution customer replies reopen ticket</span>
                    </div>
                    <select
                      className="w-24 text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                      value={channels.email.threadingWindowDays}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          email: { ...prev.email, threadingWindowDays: Number(e.target.value) },
                        }))
                      }
                    >
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Auto Acknowledgement Email Template */}
              <div className="p-4.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <Send className="w-4 h-4 text-orange-600" />
                    <span>Customer Auto-Acknowledgement Email</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channels.email.autoAckEnabled}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          email: { ...prev.email, autoAckEnabled: e.target.checked },
                        }))
                      }
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span>Send Auto-Acknowledgement</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Subject Template</label>
                  <Input
                    value={channels.email.autoAckSubject}
                    onChange={(e) =>
                      setChannels((prev) => ({
                        ...prev,
                        email: { ...prev.email, autoAckSubject: e.target.value },
                      }))
                    }
                    className="font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Body Template (Variables: <code className="text-orange-700">{'{{customer_name}}'}</code>, <code className="text-orange-700">{'{{ticket_number}}'}</code>, <code className="text-orange-700">{'{{department}}'}</code>, <code className="text-orange-700">{'{{sla_target}}'}</code>)
                  </label>
                  <textarea
                    rows={6}
                    value={channels.email.autoAckBody}
                    onChange={(e) =>
                      setChannels((prev) => ({
                        ...prev,
                        email: { ...prev.email, autoAckBody: e.target.value },
                      }))
                    }
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 p-2.5 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Test Email Connection Simulator */}
              <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-orange-950 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-orange-600" />
                    Test Inbound Email Dispatcher
                  </h2>
                  <p className="text-xs text-orange-800 mt-0.5">
                    Send a simulated customer email to test regex ticket threading, customer matching, and auto-ack.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setTestModalChannel('email');
                    handleRunTest('email');
                  }}
                  className="shrink-0 text-xs shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Test Email Parsing Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 💬 WHATSAPP CHANNEL CONFIGURATION */}
      {/* ========================================================================= */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">💬 WhatsApp Business API Integration</CardTitle>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      channels.whatsapp.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {channels.whatsapp.enabled ? 'Channel Enabled' : 'Channel Disabled'}
                  </span>
                </div>
                <CardDescription>
                  Connect your company WhatsApp Business number, configure auto-replies, and link conversations to service tickets.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleChannel('whatsapp')}
                className="text-xs shrink-0"
              >
                {channels.whatsapp.enabled ? 'Disable Channel' : 'Enable Channel'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Connected WhatsApp Business Number
                  </label>
                  <Input
                    value={channels.whatsapp.businessNumber}
                    onChange={(e) =>
                      setChannels((prev) => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, businessNumber: e.target.value },
                      }))
                    }
                    placeholder="+91 98765 43210"
                    className="font-mono text-sm"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Your official WhatsApp Business phone number verified with Meta Cloud API.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Default Department Routing
                  </label>
                  <select
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                    value={channels.whatsapp.defaultDepartmentId}
                    onChange={(e) =>
                      setChannels((prev) => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, defaultDepartmentId: e.target.value },
                      }))
                    }
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Inbound WhatsApp conversations create tickets routed to this department.
                  </p>
                </div>
              </div>

              {/* Meta Webhook Endpoint Ribbon */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Meta Cloud API Webhook Callback URL (Tenant-Isolated)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">HMAC SHA-256 Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-emerald-300 bg-slate-800/80 px-3 py-2 rounded-lg flex-1 truncate border border-slate-700">
                    https://api.kalpaksolutions.com/v1/webhooks/whatsapp/{tenantSlug}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://api.kalpaksolutions.com/v1/webhooks/whatsapp/${tenantSlug}`);
                    }}
                    className="text-xs shrink-0 text-white border-slate-700 hover:bg-slate-800"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy URL
                  </Button>
                </div>
              </div>

              {/* WhatsApp Message -> Ticket Conversion Rules */}
              <div className="p-4.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Sliders className="w-4 h-4 text-orange-600" />
                  <span>WhatsApp Message → Ticket Creation Rules</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Conversion Rule</label>
                    <select
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                      value={channels.whatsapp.messageToTicketRule}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, messageToTicketRule: e.target.value as any },
                        }))
                      }
                    >
                      <option value="AUTO_ALL_MESSAGES">Auto-convert every new message</option>
                      <option value="KEYWORD_OR_PROMPT">Interactive Menu (1: Breakdown, 2: Status)</option>
                      <option value="INTERACTIVE_MENU">Only after customer confirms</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Session Grouping Window</label>
                    <select
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                      value={channels.whatsapp.sessionWindowHours}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          whatsapp: { ...prev.whatsapp, sessionWindowHours: Number(e.target.value) },
                        }))
                      }
                    >
                      <option value="12">12 Hours</option>
                      <option value="24">24 Hours (Meta Window)</option>
                      <option value="48">48 Hours</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={channels.whatsapp.attachMediaToTicket}
                        onChange={(e) =>
                          setChannels((prev) => ({
                            ...prev,
                            whatsapp: { ...prev.whatsapp, attachMediaToTicket: e.target.checked },
                          }))
                        }
                        className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                      />
                      <span>Auto-attach photos, voice notes & videos to ticket</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Auto Reply Greetings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Instant Welcome Auto-Reply (Business Hours)
                  </label>
                  <textarea
                    rows={3}
                    value={channels.whatsapp.welcomeMessage}
                    onChange={(e) =>
                      setChannels((prev) => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, welcomeMessage: e.target.value },
                      }))
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Out-of-Hours Auto-Reply Message
                  </label>
                  <textarea
                    rows={3}
                    value={channels.whatsapp.outOfHoursMessage}
                    onChange={(e) =>
                      setChannels((prev) => ({
                        ...prev,
                        whatsapp: { ...prev.whatsapp, outOfHoursMessage: e.target.value },
                      }))
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Test WhatsApp Connection Simulator */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    Test WhatsApp Inbound Message Simulator
                  </h2>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Test customer WhatsApp message ingestion, customer account lookup, and auto-reply dispatch.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setTestModalChannel('whatsapp');
                    handleRunTest('whatsapp');
                  }}
                  className="shrink-0 text-xs shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Simulate WhatsApp Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: 🌐 WEBSITE SUPPORT WIDGET & EMBED */}
      {/* ========================================================================= */}
      {activeTab === 'website' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Widget Configurator (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">🌐 Official Website Support Form & Widget</CardTitle>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          channels.website.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {channels.website.enabled ? 'Widget Enabled' : 'Widget Disabled'}
                      </span>
                    </div>
                    <CardDescription>
                      Place a customer support form or floating widget directly on your official website.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleChannel('website')}
                    className="text-xs shrink-0"
                  >
                    {channels.website.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Branding / Visual Customization */}
                  <div className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Company Branding & Widget Appearance
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Widget Header Title</label>
                        <Input
                          value={channels.website.widgetTitle}
                          onChange={(e) =>
                            setChannels((prev) => ({
                              ...prev,
                              website: { ...prev.website, widgetTitle: e.target.value },
                            }))
                          }
                          className="text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Brand Theme Color</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={channels.website.primaryColor}
                            onChange={(e) =>
                              setChannels((prev) => ({
                                ...prev,
                                website: { ...prev.website, primaryColor: e.target.value },
                              }))
                            }
                            className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer shrink-0"
                          />
                          <Input
                            value={channels.website.primaryColor}
                            onChange={(e) =>
                              setChannels((prev) => ({
                                ...prev,
                                website: { ...prev.website, primaryColor: e.target.value },
                              }))
                            }
                            className="font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Welcome Subtitle</label>
                        <Input
                          value={channels.website.welcomeGreeting}
                          onChange={(e) =>
                            setChannels((prev) => ({
                              ...prev,
                              website: { ...prev.website, welcomeGreeting: e.target.value },
                            }))
                          }
                          className="text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Widget Position</label>
                        <select
                          className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                          value={channels.website.position}
                          onChange={(e) =>
                            setChannels((prev) => ({
                              ...prev,
                              website: { ...prev.website, position: e.target.value as any },
                            }))
                          }
                        >
                          <option value="bottom-right">Bottom Right Corner</option>
                          <option value="bottom-left">Bottom Left Corner</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Default Department</label>
                        <select
                          className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                          value={channels.website.defaultDepartmentId}
                          onChange={(e) =>
                            setChannels((prev) => ({
                              ...prev,
                              website: { ...prev.website, defaultDepartmentId: e.target.value },
                            }))
                          }
                        >
                          <option value="">-- Select Department --</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields Toggles */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Support Form Fields Configuration
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Select which fields customers must fill when raising queries through the website form.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                      {[
                        { key: 'customerName', label: 'Customer / Company Name', always: true },
                        { key: 'email', label: 'Email Address', always: true },
                        { key: 'phone', label: 'Phone Number' },
                        { key: 'assetSerial', label: 'Machine / Serial #' },
                        { key: 'serviceCategory', label: 'Service Category' },
                        { key: 'priority', label: 'Priority Selector' },
                        { key: 'attachments', label: 'File Attachments' },
                      ].map((field) => {
                        const isEnabled = channels.website.fields[field.key as keyof typeof channels.website.fields];
                        return (
                          <div
                            key={field.key}
                            onClick={() => {
                              if (field.always) return;
                              setChannels((prev) => ({
                                ...prev,
                                website: {
                                  ...prev.website,
                                  fields: {
                                    ...prev.website.fields,
                                    [field.key]: !prev.website.fields[field.key as keyof typeof channels.website.fields],
                                  },
                                },
                              }));
                            }}
                            className={`p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all ${
                              isEnabled
                                ? 'bg-white border-orange-400 text-slate-900 shadow-xs'
                                : 'bg-slate-100/70 border-slate-200 text-slate-400'
                            }`}
                          >
                            {isEnabled ? (
                              <CheckSquare className="w-4 h-4 text-orange-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <span className="text-xs font-medium">{field.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer Identification Policy */}
                  <div className="space-y-3">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Customer Identification & Auto-Match
                    </h2>
                    <select
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-900 focus:border-orange-500 focus:outline-hidden"
                      value={channels.website.customerIdentification}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          website: { ...prev.website, customerIdentification: e.target.value as any },
                        }))
                      }
                    >
                      <option value="MATCH_EMAIL_PHONE_OR_CREATE">
                        Match by Email or Phone (Auto-create guest customer profile if not found)
                      </option>
                      <option value="EXISTING_ONLY">
                        Restrict to registered customer accounts only (Validate against DB)
                      </option>
                      <option value="GUEST_TICKET">
                        Log as anonymous guest ticket with contact info in body
                      </option>
                    </select>
                  </div>

                  {/* Auto-Acknowledgement Screen Message */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      On-Screen Submission Confirmation Message
                    </label>
                    <textarea
                      rows={2}
                      value={channels.website.autoAckScreenMessage}
                      onChange={(e) =>
                        setChannels((prev) => ({
                          ...prev,
                          website: { ...prev.website, autoAckScreenMessage: e.target.value },
                        }))
                      }
                      className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Embed Snippet Generator */}
                  <div className="p-4 rounded-xl bg-slate-900 text-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-orange-400" />
                        Website Embed / Integration Snippet
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyEmbedCode}
                        className="text-xs text-white border-slate-700 hover:bg-slate-800"
                      >
                        {copiedSnippet ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                            Copied to Clipboard!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            Copy HTML Code
                          </>
                        )}
                      </Button>
                    </div>
                    <pre className="text-[11px] font-mono bg-slate-950 p-3 rounded-lg overflow-x-auto text-orange-300 border border-slate-800">
                      {embedCodeSnippet}
                    </pre>
                    <p className="text-[11px] text-slate-400">
                      Paste this snippet into the <code className="text-slate-200 font-mono">&lt;body&gt;</code> of your website. Works on WordPress, Shopify, Next.js, and custom HTML.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Interactive Widget Preview (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="sticky top-6">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-orange-600" />
                    Live Website Widget Preview
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    Interactive Preview
                  </span>
                </div>

                {/* Simulated Customer Device Frame */}
                <div className="bg-slate-100 rounded-3xl p-4 border border-slate-300 shadow-md">
                  {/* Browser Bar */}
                  <div className="bg-slate-200 rounded-t-xl px-3 py-2 flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="flex-1 bg-white text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded text-center truncate">
                      https://www.yourcompany.com/support
                    </div>
                  </div>

                  {/* Widget Card Simulation */}
                  <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                    {/* Widget Top Banner */}
                    <div
                      className="p-4 text-white"
                      style={{ backgroundColor: channels.website.primaryColor }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold text-xs">
                            {activeTenant?.name?.charAt(0) || 'K'}
                          </div>
                          <div>
                            <h2 className="text-xs font-bold leading-tight">
                              {channels.website.widgetTitle || 'Customer Support'}
                            </h2>
                            <p className="text-[10px] text-white/80">Online • Certified Engineers</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-white/90 mt-2">
                        {channels.website.welcomeGreeting}
                      </p>
                    </div>

                    {/* Simulated Form Body */}
                    <div className="p-4 space-y-3 bg-white text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Your Full Name / Company *
                        </label>
                        <input
                          type="text"
                          readOnly
                          placeholder="e.g. Apex Precision Engineering"
                          className="w-full text-xs rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-600"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                            Work Email *
                          </label>
                          <input
                            type="email"
                            readOnly
                            placeholder="tech@apex.com"
                            className="w-full text-xs rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-600"
                          />
                        </div>
                        {channels.website.fields.phone && (
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              readOnly
                              placeholder="+91 98220..."
                              className="w-full text-xs rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-600"
                            />
                          </div>
                        )}
                      </div>

                      {channels.website.fields.assetSerial && (
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                            Machine Serial / Asset ID
                          </label>
                          <input
                            type="text"
                            readOnly
                            placeholder="e.g. CNC-VMC-2024-099"
                            className="w-full text-xs rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-600"
                          />
                        </div>
                      )}

                      {channels.website.fields.serviceCategory && (
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                            Issue Category
                          </label>
                          <select
                            disabled
                            className="w-full text-xs rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-600"
                          >
                            {channels.website.categories.map((c, i) => (
                              <option key={i}>{c}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                          Problem Description *
                        </label>
                        <textarea
                          rows={2}
                          readOnly
                          placeholder="Describe the breakdown, error codes, or required servicing..."
                          className="w-full text-xs rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600"
                        />
                      </div>

                      {channels.website.fields.attachments && (
                        <div className="border border-dashed border-slate-300 rounded-lg p-2 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 bg-slate-50">
                          <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                          <span>Attach machine photos or error logs (Max 25MB)</span>
                        </div>
                      )}

                      <button
                        type="button"
                        style={{ backgroundColor: channels.website.primaryColor }}
                        className="w-full text-white font-bold text-xs py-2 rounded-lg shadow-xs hover:opacity-90 transition-opacity"
                      >
                        Submit Service Request
                      </button>

                      <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 pt-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                        <span>Powered by Kalpak Solutions Ticket Engine</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TEST CONNECTION / INGESTION SIMULATOR MODAL */}
      {/* ========================================================================= */}
      {testModalChannel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in-50">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  <Play className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 capitalize">
                    Test Inbound {testModalChannel} Simulation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Verify multi-tenant isolation, customer resolution, and ticket creation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTestModalChannel(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Customer Name</label>
                  <Input
                    value={testPayload.customerName}
                    onChange={(e) => setTestPayload({ ...testPayload, customerName: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    {testModalChannel === 'email' ? 'Sender Email' : 'Caller Phone'}
                  </label>
                  <Input
                    value={testModalChannel === 'email' ? testPayload.customerEmail : testPayload.customerPhone}
                    onChange={(e) =>
                      testModalChannel === 'email'
                        ? setTestPayload({ ...testPayload, customerEmail: e.target.value })
                        : setTestPayload({ ...testPayload, customerPhone: e.target.value })
                    }
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-medium mb-1">Issue Query / Message</label>
                <textarea
                  rows={2}
                  value={testPayload.queryText}
                  onChange={(e) => setTestPayload({ ...testPayload, queryText: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:border-orange-500 focus:outline-hidden"
                />
              </div>

              {testResult && (
                <div className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-xs space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Ingestion Pipeline Passed
                    </span>
                    <span className="text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                      Ticket #{testResult.ticketNumber}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-300 pt-1">
                    {testResult.stageLog.map((log, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-slate-500 select-none">›</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestModalChannel(null)}
                className="text-xs"
              >
                Close Simulator
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRunTest(testModalChannel)}
                disabled={testRunning}
                className="text-xs shadow-xs"
              >
                {testRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Simulating Ingestion...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Simulate Inbound Ping
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
