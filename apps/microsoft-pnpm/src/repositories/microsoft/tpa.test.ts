import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as microsoftModules from '@/common/microsoft';
import { scanThirdPartyAppsByTenantId } from './tpa';

vi.mock('@/repositories/integration/permission-grant');
vi.mock('@/common/utils');

beforeEach(() => {
  vi.resetAllMocks();
});

const tenantId = 'tenantId';

describe('scanThirdPartyAppsByTenantId', () => {
  it('should scan third-party apps and return formatted objects', async () => {
    vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
      accessToken: 'accessToken',
      scopes: [],
    });
    vi.spyOn(microsoftModules, 'getPaginatedDelegatedPermissionGrantsByTenantId').mockResolvedValue(
      { '@odata.context': 'context', value: [{ id: 'id-1' }] }
    );
    vi.spyOn(microsoftModules, 'getAllServicePrincipalsById').mockResolvedValue([]);
    const result = await scanThirdPartyAppsByTenantId(tenantId, null);
    expect(result).toStrictEqual({});
  });
});
