'use client';

import Link from 'next/link';
import { KalpakLogo } from '@/components/KalpakLogo';
import { MapPin, Mail, Phone, ArrowLeft, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-20 flex items-center justify-between">
          <KalpakLogo size="md" />

          <div className="flex items-center space-x-2 sm:space-x-4 shrink-0">
            <Link
              href="/"
              className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-orange-600 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center gap-1 sm:gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <Link
              href="/signup"
              className="whitespace-nowrap inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-700 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md transition-all"
            >
              <span className="hidden sm:inline">Start 14-Day Free Trial</span>
              <span className="sm:hidden">Free Trial</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 xl:px-12 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-wider text-orange-700 bg-orange-100/70 px-3.5 py-1 rounded-full mb-3 inline-block">
            Get In Touch
          </span>
          <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight sm:text-5xl mb-4">
            Contact Kalpak Solutions
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            Reach out to our Pune headquarters for enterprise service platform consultations, subscription inquiries, or custom software integration support.
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Address Card */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Registered Address</h2>
                <p className="text-slate-700 text-sm font-medium leading-relaxed">
                  <strong>Kalpak Solutions</strong><br />
                  Unit no. 605, 6th floor Shri Sairaj,<br />
                  Karve Nagar, Pune - 411052,<br />
                  Maharashtra, India.
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Office Hours: Mon – Sat (9:30 AM – 6:30 PM IST)</span>
            </div>
          </div>

          {/* Email & Website Card */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">E-mail & Website</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Official Inquiries:</span>
                    <a
                      href="mailto:contact@kalpaksolutions.com"
                      className="text-orange-600 hover:text-orange-700 font-bold underline"
                    >
                      contact@kalpaksolutions.com
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Company Portal:</span>
                    <a
                      href="https://kalpaksolutions.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 font-semibold underline"
                    >
                      https://kalpaksolutions.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Response within 24 business hours</span>
            </div>
          </div>

          {/* Contact Numbers Card */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">Direct Contacts</h2>
                <span className="text-xs text-slate-500 font-semibold block mb-2">Direct Calling & WhatsApp Support:</span>
                <div className="flex flex-col gap-1.5 font-bold text-slate-800 text-sm">
                  <a
                    href="tel:+919373028030"
                    className="hover:text-orange-600 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>📞 +91 93730 28030</span>
                  </a>
                  <a
                    href="tel:+919922062814"
                    className="hover:text-orange-600 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>📞 +91 99220 62814</span>
                  </a>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 font-semibold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-orange-500" />
              <span>Dedicated Enterprise Sales & Onboarding</span>
            </div>
          </div>
        </div>

        {/* Interactive Google Map Location */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span>Google Maps Location: Shri Sairaj, Karve Nagar, Pune - 411052</span>
            </div>
            <a
              href="https://maps.google.com/?q=Kalpak+Solutions+Shri+Sairaj+Karve+Nagar+Pune+411052"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 underline"
            >
              Open in Google Maps &rarr;
            </a>
          </div>
          <div className="w-full h-96 sm:h-[450px] rounded-2xl overflow-hidden border border-slate-200">
            <iframe
              title="Kalpak Solutions Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3783.7839774882964!2d73.8165651791802!3d18.493441737716836!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bfe88a5e6067%3A0x68edbc0ce1e2f5f8!2sShri%20Sairaj%2C%20Karve%20Nagar%2C%20Pune%2C%20Maharashtra%20411052!5e0!3m2!1sen!2sin!4v1725779849173!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500 text-center">
        <p>&copy; {new Date().getFullYear()} Kalpak Solutions. All rights reserved.</p>
      </footer>
    </div>
  );
}
