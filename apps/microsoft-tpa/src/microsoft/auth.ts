import { getTokenByTenantId } from 'src/common/microsoft';
import { timeout } from 'src/common/utils';
import { organizations } from 'src/db/schemas/organization';
import { db } from 'src/lib/db';

export const handleMicrosoftAuthCallback = async ({
  tenantId,
  isAdminConsentGiven,
}: {
  tenantId: string | undefined;
  isAdminConsentGiven: boolean;
}) => {
  if (isAdminConsentGiven && tenantId) {
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
      await db.insert(organizations).values({ tenantId }).onConflictDoNothing();
    } catch {
      return 'You have already given admin consent. You may close this window now.';
    }
  } else {
    return 'You must give admin consent to continue';
  }
  return 'You have successfully given admin consent. You may close this window now.';
};
