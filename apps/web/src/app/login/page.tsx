import { LoginForm } from '@/features/auth/components/login-form';
import { KalpakLogo } from '@/components/KalpakLogo';

export default function LoginPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 selection:bg-orange-500 selection:text-white">
      {/* Left Column: Enterprise Branding & Trust Signals */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 text-white p-12 flex-col justify-between relative overflow-hidden border-r border-slate-800">
        <div className="relative z-10">
          <div className="mb-10">
            <KalpakLogo size="lg" variant="dark" />
          </div>

          <div className="space-y-4 max-w-md">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight text-white">
              Enterprise Service Operations & Ticket Management
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Log, prioritize, dispatch, and track customer hardware service calls with full SLA lifecycle
              controls and PostgreSQL Row-Level Security isolation.
            </p>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Kalpak Solutions Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <LoginForm />
      </div>
    </main>
  );
}
