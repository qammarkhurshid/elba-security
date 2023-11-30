import { inngest } from '@/app/api/inngest/client';
import { getTokenByTenantId } from '@/common/microsoft';
import { timeout } from '@/common/utils';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';

export const handleMicrosoftAuthCallback = async ({
  tenantId,
  elbaOrganizationId,
  isAdminConsentGiven,
}: {
  tenantId: string | null;
  elbaOrganizationId: string | undefined;
  isAdminConsentGiven: boolean;
}) => {
  if (!isAdminConsentGiven || !tenantId || !elbaOrganizationId) {
    return 'You must give admin consent to continue';
  }
  const { scopes } = await getTokenByTenantId(tenantId);
  await timeout(10000);
  if (
    !scopes.includes('DelegatedPermissionGrant.ReadWrite.All') ||
    !scopes.includes('Application.ReadWrite.All') ||
    !scopes.includes('User.Read.All')
  ) {
    throw new Error("Couldn't retrieve required scopes");
  }
  try {
    await db.insert(organizations).values({ tenantId, elbaOrganizationId });
    await inngest.send({ name: 'users/scan', data: { tenantId, isFirstScan: true } });
  } catch {
    return 'You have already given admin consent. You may close this window now.';
  }
  return 'You have successfully given admin consent. You may close this window now.';
};
