'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { Button, Input, PasswordInput, Alert } from '@/components/ui';
import { ArrowRight } from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';

export default function SignupPage() {
  const router = useRouter();

  // Organization Fields
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [country, setCountry] = useState('United States');
  const [timezone, setTimezone] = useState('America/New_York');

  // Admin User Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-generate slug from company name
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanyName(val);
    if (!slug || slug === autoSlug(companyName)) {
      setSlug(autoSlug(val));
    }
  };

  const autoSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Password and confirmation do not match');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          companyName: companyName.trim(),
          slug: slug.trim().toLowerCase(),
          businessEmail: businessEmail.trim() || undefined,
          phoneNumber: phoneNumber.trim() || undefined,
          country: country.trim() || undefined,
          timezone: timezone.trim() || undefined,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      // Redirect directly to dashboard or onboarding
      router.push('/dashboard');
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.errorResponse?.details && err.errorResponse.details.length > 0) {
          const detailMessages = err.errorResponse.details
            .map((d) => d.message)
            .filter(Boolean)
            .join(' • ');
          setError(detailMessages || err.errorResponse.message || 'Validation failed');
        } else {
          setError(err.errorResponse?.message || err.message || 'Registration failed');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 selection:bg-orange-500 selection:text-white">
      {/* Left Column: Branding */}
      <div className="hidden lg:flex lg:col-span-4 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white p-10 flex-col justify-between border-r border-slate-800">
        <div>
          <div className="mb-10">
            <KalpakLogo size="lg" variant="dark" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white mb-4">
            Start Your 14-Day Free Organization Trial
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Create an isolated tenant workspace for your field service and equipment maintenance team. No
            credit card required during initial setup.
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-orange-400 font-semibold hover:text-orange-300 transition-colors">
            Sign In here
          </Link>
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="lg:col-span-8 flex items-center justify-center p-4 sm:p-10 lg:p-14">
        <div className="w-full max-w-xl bg-white p-6 sm:p-10 rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-100">
          <div className="lg:hidden mb-6">
            <KalpakLogo size="md" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Register Organization</h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure your company workspace and create your first administrator account.
            </p>
          </div>

          {error && (
            <div className="mb-6">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Information Section */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                1. Organization Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    id="company-name"
                    label="Company / Business Name"
                    required
                    value={companyName}
                    onChange={handleCompanyNameChange}
                    placeholder="Acme Service Solutions"
                  />
                </div>
                <div>
                  <Input
                    id="org-slug"
                    label="Organization Slug"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="acme-service"
                    helperText="Unique identifier for workspace URL"
                  />
                </div>
                <div>
                  <Input
                    id="biz-email"
                    type="email"
                    label="Business Email (Optional)"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    placeholder="support@acme.com"
                  />
                </div>
                <div>
                  <Input
                    id="phone"
                    type="tel"
                    label="Phone Number (Optional)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                  />
                </div>
                <div>
                  <Input
                    id="country"
                    label="Country (Optional)"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="United States"
                  />
                </div>
                <div>
                  <Input
                    id="timezone"
                    label="Primary Timezone (Optional)"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="America/New_York"
                  />
                </div>
              </div>
            </div>

            {/* Administrator Account Section */}
            <div className="pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                2. Client Administrator Account
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Input
                      id="admin-name"
                      label="Full Name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alice Johnson"
                    />
                  </div>
                  <div>
                    <Input
                      id="admin-email"
                      type="email"
                      label="Work Email Address"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alice@acme.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <PasswordInput
                      id="admin-password"
                      label="Password"
                      required
                      showStrength={true}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <PasswordInput
                      id="admin-confirm-password"
                      label="Confirm Password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" isLoading={isLoading} className="w-full h-11 text-sm shadow-md">
                <span>Create Organization & Continue</span>
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
            Already registered?{' '}
            <Link href="/login" className="font-bold text-orange-600 hover:text-orange-700 transition-colors">
              Sign In to Workspace
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
