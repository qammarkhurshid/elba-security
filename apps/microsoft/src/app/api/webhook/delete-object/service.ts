import { env } from '@/common/env';
import { checkPermissionGrant } from '@/repositories/integration/permission-grant';
import { deletePermissionGrantById, getTokenByTenantId } from '@/repositories/microsoft/graph-api';
import { Elba } from '@elba-security/sdk';

export const deleteObject = async ({
  organisationId,
  grantId,
  userId,
  appId,
}: {
  organisationId: string;
  userId: string;
  grantId: string;
  appId: string;
}) => {
  checkPermissionGrant({ tenantId: organisationId, userId, appId, grantId });
  const token = await getTokenByTenantId(organisationId);

  await deletePermissionGrantById({
    tenantId: organisationId,
    appId,
    id: grantId,
    accessToken: token.accessToken,
  });

  const elba = new Elba({
    apiKey: env.ELBA_API_KEY,
    organisationId,
    sourceId: env.ELBA_SOURCE_ID,
    baseUrl: env.ELBA_API_BASE_URL,
    region: 'eu',
  });

  await elba.thirdPartyApps.deleteObjects({ ids: [{ userId, appId }] });
};
