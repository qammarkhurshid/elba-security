import { env } from '@/common/env';
import { checkPermissionGrant } from '@/repositories/integration/permission-grant';
import { fetchPermissionGrantById, getTokenByTenantId } from '@/repositories/microsoft/graph-api';
import { Elba } from '@elba-security/sdk';

export const refreshObject = async ({
  organisationId,
  userId,
  appId,
  grantId,
}: {
  organisationId: string;
  userId: string;
  appId: string;
  grantId: string;
}) => {
  checkPermissionGrant({ tenantId: organisationId, userId, appId, grantId });

  const token = await getTokenByTenantId(organisationId);
  const fetchedPermissionGrant = await fetchPermissionGrantById({
    tenantId: organisationId,
    appId,
    accessToken: token.accessToken,
    id: grantId,
  });

  const elba = new Elba({
    apiKey: env.ELBA_API_KEY,
    organisationId,
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_API_BASE_URL,
    region: 'eu',
  });

  if (fetchedPermissionGrant) {
    await elba.thirdPartyApps.updateObjects({ apps: fetchedPermissionGrant });
  }
};
