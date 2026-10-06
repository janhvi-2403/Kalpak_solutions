'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  KeyRound,
  UserX,
  Shield,
  Lock,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
} from '@/components/ui';

interface AdminUser {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  phoneNumber?: string | null;
  isActive: boolean;
  mfaEnabled: boolean;
  role: string;
  joinedAt: string;
  lastLoginAt: string | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  fullName?: string | null;
  phone?: string | null;
  department?: string | null;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
  token?: string;
  inviteUrl?: string;
}

export default function ClientAdminsPage() {
  const { user: currentUser } = useAuth();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);

  // Deactivate / Status Action State
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Revoke Action State
  const [revokeInviteId, setRevokeInviteId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Resend State
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resentModalInfo, setResentModalInfo] = useState<{ email: string; inviteUrl: string } | null>(null);
  const [resentTokens, setResentTokens] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setFeedback(null);

      const [usersRes, invitesRes] = await Promise.all([
        apiClient<{ items: AdminUser[] }>('/users?limit=50'),
        apiClient<PendingInvitation[]>('/tenants/invitations'),
      ]);

      // Filter only Client Admins for this page
      const clientAdmins = (usersRes.items || []).filter(
        (u) => u.role === 'CLIENT_ADMIN' || u.role === 'SUPER_ADMIN'
      );
      setAdmins(clientAdmins);

      // Filter only Client Admin invitations
      const adminInvites = (invitesRes || []).filter(
        (inv) => inv.role === 'CLIENT_ADMIN'
      );
      setInvitations(adminInvites);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load client administrators data',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute active admins count for rule enforcement
  const activeAdminsCount = admins.filter((a) => a.isActive).length;

  // Handle Send Invitation
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim() || !invitePhone.trim()) {
      setFeedback({ type: 'error', message: 'Name, email address, and phone number are all required.' });
      return;
    }

    try {
      setIsInviting(true);
      setFeedback(null);

      const res = await apiClient<{
        success: boolean;
        message: string;
        invitation: { inviteUrl?: string; token?: string };
      }>('/tenants/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail.trim(),
          fullName: inviteName.trim(),
          phone: invitePhone.trim(),
          role: 'CLIENT_ADMIN',
          department: 'Executive Administration',
        }),
      });

      const url =
        res.invitation?.inviteUrl ||
        `${window.location.origin}/accept-invitation?token=${res.invitation?.token || ''}`;
      setCreatedInviteUrl(url);

      setFeedback({
        type: 'success',
        message: `Invitation successfully dispatched to ${inviteEmail}. They will set their password and 2-step authentication.`,
      });

      await fetchData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({ type: 'error', message: err.errorResponse.message || 'Failed to send admin invitation.' });
      } else {
        setFeedback({ type: 'error', message: 'Network error occurred while sending invitation.' });
      }
    } finally {
      setIsInviting(false);
    }
  };

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
    setInvitePhone('');
    setCreatedInviteUrl(null);
  };

  // Handle Toggle User Active/Inactive
  const handleConfirmStatusChange = async () => {
    if (!confirmUser) return;

    const newStatus = !confirmUser.isActive;

    // Client-side rule check
    if (!newStatus && activeAdminsCount <= 1) {
      setFeedback({
        type: 'error',
        message: 'Rule violation: At least one active Client Admin must always remain in the organization.',
      });
      setConfirmUser(null);
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setFeedback(null);

      await apiClient(`/users/${confirmUser.userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newStatus }),
      });

      setFeedback({
        type: 'success',
        message: `Administrator "${confirmUser.fullName}" has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });

      setConfirmUser(null);
      await fetchData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({ type: 'error', message: err.errorResponse.message || 'Failed to update user status.' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to update user status.' });
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Resend Invitation
  const handleResendInvite = async (invitationId: string, email: string) => {
    try {
      setResendingId(invitationId);
      setFeedback(null);

      const res = await apiClient<{ success: boolean; message: string; inviteUrl?: string; token?: string }>(
        `/tenants/invitations/${invitationId}/resend`,
        { method: 'POST' }
      );

      const url =
        res.inviteUrl ||
        `${window.location.origin}/accept-invitation?token=${res.token || ''}`;

      if (res.token) {
        setResentTokens((prev) => ({ ...prev, [invitationId]: res.token! }));
      }

      setResentModalInfo({
        email,
        inviteUrl: url,
      });

      setFeedback({
        type: 'success',
        message: `Fresh invitation email sent to ${email} with a renewed 7-day token.`,
      });

      await fetchData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({ type: 'error', message: err.errorResponse.message || 'Failed to resend invitation.' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to resend invitation.' });
      }
    } finally {
      setResendingId(null);
    }
  };

  // Handle Revoke Invitation
  const handleConfirmRevoke = async () => {
    if (!revokeInviteId) return;

    try {
      setIsRevoking(true);
      setFeedback(null);

      await apiClient(`/tenants/invitations/${revokeInviteId}`, {
        method: 'DELETE',
      });

      setFeedback({
        type: 'success',
        message: 'The administrator invitation has been revoked and the link invalidated.',
      });

      setRevokeInviteId(null);
      await fetchData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFeedback({ type: 'error', message: err.errorResponse.message || 'Failed to revoke invitation.' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to revoke invitation.' });
      }
    } finally {
      setIsRevoking(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Client Administrators</h1>
                <Badge variant="primary" className="font-mono text-xs">
                  {admins.length} Registered
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage organization co-administrators, invite new admins with 2-step authentication, and maintain business continuity.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          <span>Invite Client Admin</span>
        </Button>
      </div>

      {/* Organizational Business Continuity Rule Alert */}
      <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 flex items-start gap-3 text-xs sm:text-sm shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <span>Mandatory System Rule:</span>
            <span className="font-normal text-amber-800">
              At least one active Client Admin must always remain in the organization at all times.
            </span>
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Deactivation of the last active administrator is strictly prohibited by server-side policy to prevent organizational lockout.
            All invited Client Admins are required to configure a password and 2-step authenticator upon accepting their invite.
          </p>
        </div>
      </div>

      {/* Global Feedback Banner */}
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
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline hover:opacity-80 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Admins</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{admins.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Active or registered accounts</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Admins</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{activeAdminsCount}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {activeAdminsCount <= 1 ? '⚠️ Minimum 1 required (Locked)' : 'Healthy administrative redundancy'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">2-Step Auth (MFA)</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {admins.filter((a) => a.mfaEnabled).length} / {admins.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Enforced on all invited admins</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Pending Invites</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{invitations.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Awaiting password & 2FA activation</p>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Active & Registered Client Administrators */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Active Administrators Roster</span>
                <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                  {admins.length}
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Personnel authorized to configure organizational policies, manage subscriptions, and invite staff.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : admins.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No Client Administrators found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Administrator</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Role & Security</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Joined / Last Active</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {admins.map((admin) => {
                    const isSelf = currentUser?.id === admin.userId;
                    const isLastActiveAdmin = admin.isActive && activeAdminsCount <= 1;

                    return (
                      <tr key={admin.userId} className="hover:bg-slate-50/60 transition-colors">
                        {/* Administrator Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                              {admin.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{admin.fullName}</span>
                                {isSelf && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded font-mono">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{admin.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Contact details */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="space-y-1">
                            {admin.phoneNumber ? (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{admin.phoneNumber}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No phone added</span>
                            )}
                          </div>
                        </td>

                        {/* Role & Security */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-200/80">
                              <ShieldCheck className="w-3 h-3 text-orange-600" />
                              CLIENT_ADMIN
                            </span>
                            <div>
                              {admin.mfaEnabled ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <Lock className="w-2.5 h-2.5 text-emerald-600" />
                                  2FA Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  2FA Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {admin.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/70">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Deactivated
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          <div>Joined: {new Date(admin.joinedAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {admin.lastLoginAt
                              ? `Active: ${new Date(admin.lastLoginAt).toLocaleDateString()}`
                              : 'No login record'}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {admin.isActive ? (
                            <div className="inline-flex flex-col items-end">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isSelf || isLastActiveAdmin}
                                onClick={() => setConfirmUser(admin)}
                                className={`h-8 text-xs ${
                                  isSelf || isLastActiveAdmin
                                    ? 'opacity-50 cursor-not-allowed text-slate-400'
                                    : 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200'
                                }`}
                                title={
                                  isSelf
                                    ? 'You cannot deactivate your own account'
                                    : isLastActiveAdmin
                                    ? 'Rule: At least one active Client Admin must always remain'
                                    : 'Deactivate administrator access'
                                }
                              >
                                <UserX className="w-3.5 h-3.5 mr-1" />
                                <span>Deactivate</span>
                              </Button>
                              {isLastActiveAdmin && (
                                <span className="text-[9px] text-amber-700 font-semibold mt-1">
                                  Last Active Admin (Protected)
                                </span>
                              )}
                              {isSelf && !isLastActiveAdmin && (
                                <span className="text-[9px] text-slate-400 mt-1">Self Account</span>
                              )}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmUser(admin)}
                              className="h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              <span>Reactivate</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Pending Client Admin Invitations */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Pending Administrator Invitations</span>
                <span className="text-xs font-mono px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md">
                  {invitations.length}
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Invited users who have not yet completed their password creation and 2-step authenticator pairing.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">No pending administrator invitations</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Click &quot;Invite Client Admin&quot; above to invite an additional organization administrator.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Invited Person</th>
                    <th className="py-3 px-4">Contact Details</th>
                    <th className="py-3 px-4">Invited By</th>
                    <th className="py-3 px-4">Expires</th>
                    <th className="py-3 px-4 text-right">Manage Invitation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv) => {
                    const token = inv.token || resentTokens[inv.id];
                    const inviteUrl =
                      inv.inviteUrl ||
                      (token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/accept-invitation?token=${token}` : '');
                    const isCopied = copiedId === inv.id;

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Invited Person */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{inv.fullName || 'Invited Administrator'}</div>
                          <div className="text-[11px] font-mono text-slate-500">{inv.email}</div>
                          <span className="inline-block mt-1 font-mono text-[9px] font-bold bg-orange-50 text-orange-700 px-1.5 py-0.2 rounded border border-orange-200">
                            CLIENT_ADMIN
                          </span>
                        </td>

                        {/* Phone */}
                        <td className="py-3.5 px-4 text-slate-600">
                          {inv.phone ? (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{inv.phone}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not specified</span>
                          )}
                        </td>

                        {/* Invited By */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div>{inv.invitedBy}</div>
                          <div className="text-[10px] text-slate-400">
                            Sent {new Date(inv.createdAt).toLocaleDateString()}
                          </div>
                        </td>

                        {/* Expiration */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(inv.expiresAt).toLocaleDateString()}</span>
                          </div>
                        </td>

                        {/* Actions: Resend & Revoke */}
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {/* Copy Link */}
                          {inviteUrl ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(inviteUrl, inv.id)}
                              className="h-8 text-xs text-slate-600"
                              title="Copy direct invitation link"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 mr-1" />
                              )}
                              <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                            </Button>
                          ) : null}

                          {/* Resend Invite */}
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={resendingId === inv.id}
                            onClick={() => handleResendInvite(inv.id, inv.email)}
                            className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                            title="Generate a fresh token and email it"
                          >
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            <span>Resend</span>
                          </Button>

                          {/* Revoke Invite */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRevokeInviteId(inv.id)}
                            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            title="Invalidate this invitation immediately"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            <span>Revoke</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: Invite Client Admin Dialog */}
      <Dialog
        isOpen={isInviteModalOpen}
        onClose={closeInviteModal}
        title="Invite Additional Client Administrator"
        description="Grant full organizational management rights with mandatory 2-step authentication."
      >
        {createdInviteUrl ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Invitation Email Dispatched!</span>
              </div>
              <p className="text-emerald-800">
                An invitation email has been sent to <strong>{inviteEmail}</strong>. They will set their password and pair their authenticator app.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Direct Invitation Link</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={createdInviteUrl}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-700"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdInviteUrl, 'modal-copy')}
                  className="shrink-0"
                >
                  {copiedId === 'modal-copy' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                You can copy and send this link directly if the recipient cannot access their email inbox.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button onClick={closeInviteModal} className="bg-orange-600 hover:bg-orange-700 text-white">
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInviteSubmit} className="space-y-4 mt-3">
            <Input
              id="invite-admin-name"
              label="Full Name"
              required
              placeholder="e.g. Ramesh Patel"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              helperText="The administrator's legal or official display name"
            />

            <Input
              id="invite-admin-email"
              type="email"
              label="Work Email Address"
              required
              placeholder="e.g. ramesh.patel@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              helperText="The invitation and security alerts will be delivered here"
            />

            <Input
              id="invite-admin-phone"
              label="Mobile / Phone Number"
              required
              placeholder="e.g. +91 98765 43210"
              value={invitePhone}
              onChange={(e) => setInvitePhone(e.target.value)}
              helperText="Required for SMS verification fallback and contact record"
            />

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Assigned Privilege:</span>
                <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  CLIENT_ADMIN
                </span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed pt-1">
                Client Admins have organizational control, including user invitations, routing configuration, billing, and ticket oversight.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={closeInviteModal} disabled={isInviting}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isInviting} className="bg-orange-600 hover:bg-orange-700 text-white">
                Dispatch Invitation
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* MODAL 2: Confirm Deactivate/Activate Administrator */}
      <Dialog
        isOpen={confirmUser !== null}
        onClose={() => setConfirmUser(null)}
        title={confirmUser?.isActive ? 'Deactivate Client Administrator' : 'Reactivate Client Administrator'}
        description={
          confirmUser?.isActive
            ? `Are you sure you want to deactivate ${confirmUser?.fullName}?`
            : `Are you sure you want to restore active access for ${confirmUser?.fullName}?`
        }
      >
        <div className="space-y-4 py-2 text-xs sm:text-sm text-slate-600">
          {confirmUser?.isActive ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Security Impact of Deactivation</span>
              </p>
              <p className="text-xs text-red-800 leading-relaxed">
                Deactivating this administrator will immediately revoke their access and terminate all active sessions.
                Historical audit logs and created records remain intact.
              </p>
            </div>
          ) : (
            <p>
              Reactivating this administrator will restore their administrative rights. They will be able to log in with their existing credentials.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmUser(null)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmStatusChange}
              isLoading={isUpdatingStatus}
              className={
                confirmUser?.isActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }
            >
              {confirmUser?.isActive ? 'Confirm Deactivation' : 'Confirm Activation'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 3: Confirm Revoke Invitation */}
      <Dialog
        isOpen={revokeInviteId !== null}
        onClose={() => setRevokeInviteId(null)}
        title="Revoke Administrator Invitation"
        description="Are you sure you want to revoke this pending invitation?"
      >
        <div className="space-y-4 py-2 text-xs sm:text-sm text-slate-600">
          <p>
            Revoking this invitation will immediately expire the security token. If the recipient tries to open the link, they will receive an error.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRevokeInviteId(null)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRevoke}
              isLoading={isRevoking}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Revoke Invitation
            </Button>
          </div>
        </div>
      </Dialog>

      {/* MODAL 4: Resent Invitation Link Dialog */}
      <Dialog
        isOpen={resentModalInfo !== null}
        onClose={() => setResentModalInfo(null)}
        title="Invitation Resent Successfully"
        description="A renewed 7-day security token has been generated and dispatched."
      >
        {resentModalInfo && (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-bold mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Invitation Email Sent!</span>
              </div>
              <p className="text-emerald-800">
                A fresh invitation link was sent to <strong>{resentModalInfo.email}</strong>. The previous link has been invalidated and replaced with this new link.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Renewed Direct Invitation Link</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={resentModalInfo.inviteUrl}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-700 select-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(resentModalInfo.inviteUrl, 'resent-modal-copy')}
                  className="shrink-0"
                >
                  {copiedId === 'resent-modal-copy' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                You can copy and send this link directly to the administrator.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button onClick={() => setResentModalInfo(null)} className="bg-orange-600 hover:bg-orange-700 text-white">
                Done
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
