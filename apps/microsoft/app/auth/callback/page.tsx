import { handleMicrosoftAuthCallback } from '#src/microsoft/auth';

export default async function Page({ searchParams }): Promise<JSX.Element> {
  const tenantId = searchParams.tenant;
  const isAdminConsentGiven = searchParams.admin_consent === 'True';
  const message = await handleMicrosoftAuthCallback({ tenantId, isAdminConsentGiven });

  return <main>{message}</main>;
}
