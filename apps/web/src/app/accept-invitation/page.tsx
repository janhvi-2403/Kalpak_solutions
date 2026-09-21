'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, Input, PasswordInput, Alert, Badge } from '@/components/ui';
import { UserCheck, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { PublicInvitationInfo } from '@kalpak/types';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [invitationInfo, setInvitationInfo] = useState<PublicInvitationInfo | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    if (token) {
      apiClient<PublicInvitationInfo>(`/auth/invitations/${token}`)
        .then((data) => {
          setInvitationInfo(data);
        })
        .catch((err) => {
          if (err instanceof ApiClientError) {
            setError(err.errorResponse.message || 'Invitation not found or has expired.');
          } else {
            setError('Unable to load invitation details.');
          }
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    } else {
      setError('Invitation token is missing from the URL.');
      setIsLoadingDetails(false);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient('/auth/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({
          token,
          fullName: fullName.trim(),
          password,
        }),
      });

      setIsAccepted(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.errorResponse.message || 'Failed to accept invitation');
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDetails) {
    return (
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
        Validating employee invitation...
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100">
      <div className="mb-6">
        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center mb-4">
          <UserCheck className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Join Organization</h1>
        <p className="text-sm text-slate-500 mt-1">
          You have been invited to join the Kalpak Service Operations workspace.
        </p>
      </div>

      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {isAccepted ? (
        <div className="py-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Welcome to the Team!</h3>
          <p className="text-sm text-slate-600 mt-2 mb-6 leading-relaxed">
            Your employee account has been created and linked to{' '}
            <strong className="text-slate-900">{invitationInfo?.tenantName}</strong>.
          </p>
          <Link href="/login">
            <Button className="w-full h-11 text-sm shadow-md">
              <span>Sign In to Dashboard</span>
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      ) : invitationInfo ? (
        <div>
          {/* Invitation Details Summary Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-6 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Organization</span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                {invitationInfo.tenantName}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Invited Email</span>
              <span className="font-mono text-slate-800">{invitationInfo.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Assigned Role</span>
              <Badge variant="primary" className="text-[10px] py-0 px-2">
                {invitationInfo.role}
              </Badge>
            </div>
            {invitationInfo.department && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Department</span>
                <span className="text-slate-700">{invitationInfo.department}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="employee-name"
              label="Your Full Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Bob Miller"
            />

            <PasswordInput
              id="employee-password"
              label="Create Password"
              required
              showStrength={true}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <PasswordInput
              id="employee-confirm-password"
              label="Confirm Password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button type="submit" isLoading={isSubmitting} className="w-full h-11 text-sm shadow-md mt-2">
              <span>Accept Invitation & Activate Account</span>
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="text-center pt-2">
          <Link href="/login" className="text-sm font-semibold text-sky-600 hover:underline">
            Return to Login
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <Suspense fallback={<div className="text-sm text-slate-500">Loading invitation...</div>}>
        <AcceptInvitationContent />
      </Suspense>
    </main>
  );
}
