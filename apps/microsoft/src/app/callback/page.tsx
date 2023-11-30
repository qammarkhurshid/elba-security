import { cookies } from 'next/headers';
import { RedirectType, redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { handleMicrosoftAuthCallback } from '@/repositories/microsoft/auth';

type CallbackPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CallbackPage({ searchParams }: CallbackPageProps) {
  const isAdminConsentGiven = searchParams?.admin_consent === 'True';
  const tenantId = searchParams?.tenant as string;
  const organizationId = cookies().get('organizationId')?.value;

  try {
    await handleMicrosoftAuthCallback({
      isAdminConsentGiven,
      tenantId,
      elbaOrganizationId: organizationId,
    });
    // TODO - replace url by elba install success
    redirect('https://foo.bar', RedirectType.replace);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    // TODO - replace url by elba install error
    redirect('https://foo.bar?error=true', RedirectType.replace);
  }
}
