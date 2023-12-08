import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as microsoftModules from '@/repositories/microsoft/graph-api';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { scanThirdPartyAppsByTenantId } from './tpa';

vi.mock('@/repositories/integration/permission-grant');
vi.mock('@/common/utils');

beforeEach(() => {
  vi.resetAllMocks();
});

const tenantId = 'tenantId';
const elbaOrganizationId = 'elbaOrganizationId';
const accessToken = 'accessToken';

describe('scanThirdPartyAppsByTenantId', () => {
  it('should scan third-party apps and return formatted objects', async () => {
    await db.insert(organizations).values({ elbaOrganizationId, tenantId });
    vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
      accessToken: 'accessToken',
      scopes: [],
    });
    vi.spyOn(microsoftModules, 'getPaginatedDelegatedPermissionGrantsByTenantId').mockResolvedValue(
      {
        '@odata.context': 'context',
        value: [
          {
            id: 'id-1',
            clientId: 'clientId',
            consentType: 'Principal',
            principalId: 'principalId',
            resourceId: 'resourceId',
            scope: 'scope-1 scope-2',
          },
        ],
      }
    );
    vi.spyOn(microsoftModules, 'getAllServicePrincipalsById').mockResolvedValue([
      {
        id: 'clientId',
        appId: 'appId',
        appDisplayName: 'displayName',
        description: 'description',
        publisherName: 'verifiedPublisher',
        logoUrl: 'logoUrl',
        tags: [],
        appRoles: [],
        appRoleAssignments: [],
        homepage: 'homepage',
        servicePrincipalNames: ['servicePrincipalName'],
      },
    ]);
    const result = await scanThirdPartyAppsByTenantId({
      tenantId,
      accessToken,
      pageLink: undefined,
    });
    expect(result).toStrictEqual({
      pageLink: undefined,
      permissionGrantsObjects: [
        {
          appId: 'clientId',
          grantId: 'id-1',
          tenantId: 'tenantId',
          userId: 'principalId',
        },
      ],
      thirdPartyAppsObjects: {
        apps: [
          {
            description: 'description',
            id: 'clientId',
            name: 'displayName',
            publisherName: 'verifiedPublisher',
            logoUrl: 'logoUrl',
            url: 'homepage',
            users: [
              {
                id: 'principalId',
                metadata: {
                  grantId: 'id-1',
                },
                scopes: ['scope-1', 'scope-2'],
              },
            ],
          },
        ],
      },
    });
  });
});
