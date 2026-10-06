'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Button, Input, PasswordInput, Alert } from '@/components/ui';
import { ArrowRight } from 'lucide-react';
import { KalpakLogo } from '@/components/KalpakLogo';

function SignupContent() {
  const { refetchSession } = useAuth();

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

  // Error States
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorList, setErrorList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-generate slug from company name
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCompanyName(val);
    if (!slug || slug === autoSlug(companyName)) {
      setSlug(autoSlug(val));
    }
    if (fieldErrors['companyName']) {
      setFieldErrors((prev) => ({ ...prev, companyName: '' }));
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

  const validateClientSide = (): boolean => {
    const errors: Record<string, string> = {};
    const messages: string[] = [];

    if (!companyName.trim() || companyName.trim().length < 2) {
      errors.companyName = 'Company name must be at least 2 characters';
      messages.push('Company Name: Must be at least 2 characters');
    }

    const cleanSlug = slug.trim().toLowerCase();
    if (!cleanSlug || cleanSlug.length < 3) {
      errors.slug = 'Slug must be at least 3 characters';
      messages.push('Organization Slug: Must be at least 3 characters');
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
      errors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens (e.g. acme-service)';
      messages.push('Organization Slug: Must only contain lowercase letters, numbers, and single hyphens');
    }

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
      messages.push('Administrator Name: Must be at least 2 characters');
    }

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid work email address';
      messages.push('Work Email: A valid email address is required');
    }

    if (businessEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail.trim())) {
      errors.businessEmail = 'Please enter a valid business email address';
      messages.push('Business Email: Invalid email format');
    }

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const hasLength = password.length >= 8;

    if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      errors.password = 'Password must have 8+ chars, uppercase, lowercase, number & special symbol (!@#$)';
      messages.push('Password: Requires 8+ characters, uppercase, lowercase, number, and special symbol (!@#$)');
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      messages.push('Confirm Password: Passwords do not match');
    }

    setFieldErrors(errors);
    setErrorList(messages);

    if (messages.length > 0) {
      setGeneralError('Please correct the highlighted fields below to continue.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});
    setErrorList([]);

    if (!validateClientSide()) {
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

      // Refresh auth state with newly issued session
      await refetchSession();

      // Redirect client admin directly to real subscription checkout
      window.location.href = '/checkout/starter';
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        const res = err.errorResponse;
        const newFieldErrors: Record<string, string> = {};
        const newErrorList: string[] = [];

        // Check if backend returned specific validation details
        if (res?.details && res.details.length > 0) {
          res.details.forEach((d) => {
            const msg = d.message || '';
            newErrorList.push(msg);

            const lower = msg.toLowerCase();
            if (lower.includes('company') || lower.includes('companyname')) {
              newFieldErrors.companyName = msg;
            } else if (lower.includes('slug')) {
              newFieldErrors.slug = msg;
            } else if (lower.includes('business email') || lower.includes('businessemail')) {
              newFieldErrors.businessEmail = msg;
            } else if (lower.includes('full name') || lower.includes('fullname')) {
              newFieldErrors.fullName = msg;
            } else if (lower.includes('password') || lower.includes('character')) {
              newFieldErrors.password = msg;
            } else if (lower.includes('email')) {
              newFieldErrors.email = msg;
            }
          });

          setFieldErrors(newFieldErrors);
          setErrorList(newErrorList);
          setGeneralError(res.message || 'Validation failed. Please review the highlighted parameters:');
        } else if (res?.message) {
          const msg = res.message;
          setGeneralError(msg);
          newErrorList.push(msg);

          const lower = msg.toLowerCase();
          if (lower.includes('email') && lower.includes('exists')) {
            newFieldErrors.email = msg;
          } else if (lower.includes('slug') && lower.includes('taken')) {
            newFieldErrors.slug = msg;
          }
          setFieldErrors(newFieldErrors);
          setErrorList(newErrorList);
        } else {
          setGeneralError(err.message || 'Registration failed. Please try again.');
        }
      } else {
        setGeneralError('An unexpected network error occurred. Please check your connection.');
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

          {/* User-friendly Validation Error Alert */}
          {generalError && (
            <div className="mb-6">
              <Alert variant="error" title="Please resolve the following issues:">
                <div className="space-y-1.5 mt-1 text-xs">
                  {errorList.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1">
                      {errorList.map((errItem, idx) => (
                        <li key={idx} className="leading-relaxed font-medium">
                          {errItem}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>{generalError}</p>
                  )}
                </div>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
                    error={fieldErrors['companyName']}
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
                    error={fieldErrors['slug']}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                      if (fieldErrors['slug']) {
                        setFieldErrors((prev) => ({ ...prev, slug: '' }));
                      }
                    }}
                    placeholder="acme-service"
                    helperText={!fieldErrors['slug'] ? 'Unique identifier for workspace URL' : undefined}
                  />
                </div>
                <div>
                  <Input
                    id="biz-email"
                    type="email"
                    label="Business Email (Optional)"
                    value={businessEmail}
                    error={fieldErrors['businessEmail']}
                    onChange={(e) => {
                      setBusinessEmail(e.target.value);
                      if (fieldErrors['businessEmail']) {
                        setFieldErrors((prev) => ({ ...prev, businessEmail: '' }));
                      }
                    }}
                    placeholder="support@acme.com"
                  />
                </div>
                <div>
                  <Input
                    id="phone"
                    type="tel"
                    label="Phone Number (Optional)"
                    value={phoneNumber}
                    error={fieldErrors['phoneNumber']}
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
                      error={fieldErrors['fullName']}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        if (fieldErrors['fullName']) {
                          setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                        }
                      }}
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
                      error={fieldErrors['email']}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors['email']) {
                          setFieldErrors((prev) => ({ ...prev, email: '' }));
                        }
                      }}
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
                      error={fieldErrors['password']}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors['password']) {
                          setFieldErrors((prev) => ({ ...prev, password: '' }));
                        }
                      }}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <PasswordInput
                      id="admin-confirm-password"
                      label="Confirm Password"
                      required
                      value={confirmPassword}
                      error={fieldErrors['confirmPassword']}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (fieldErrors['confirmPassword']) {
                          setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                        }
                      }}
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-slate-500">Loading signup...</div>}>
      <SignupContent />
    </Suspense>
  );
}
