import { handleMicrosoftAuthCallback } from '@/repositories/microsoft/auth';
import { cookies } from 'next/headers';

type CallbackPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function CallbackPage({ searchParams }: CallbackPageProps) {
  const isAdminConsentGiven = searchParams?.admin_consent === 'True';
  const tenantId = searchParams?.tenant as string;
  const organizationId = cookies().get('organizationId')?.value;
  const region = cookies().get('region')?.value;

  try {
    const result = await handleMicrosoftAuthCallback({
      isAdminConsentGiven,
      tenantId,
      elbaOrganizationId: organizationId,
      region,
    });
    // TODO - replace url by elba install success
    return result;
  } catch (error) {
    throw new Error('Something wrong happened', { cause: error });
  }
}
