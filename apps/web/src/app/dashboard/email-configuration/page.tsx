import { redirect } from 'next/navigation';

export default function EmailConfigRedirectPage() {
  redirect('/dashboard/settings/email-configuration');
}
