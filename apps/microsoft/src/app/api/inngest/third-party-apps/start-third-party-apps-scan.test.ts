import { expect, test, describe, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { organizations } from '@/schemas';
import { db } from '@/lib/db';
import * as microsoftModules from '@/common/microsoft';
import { createFunctionMock } from '../functions/__mocks__/inngest';
import { startThirdPartyAppsScan } from './start-third-party-apps-scan';

const ids = Array.from({ length: 5 }, (_, i) => `${i}`);
const mockedOrganizations = ids.map((id) => ({
  id,
  tenantId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  elbaOrganizationId: `45b76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
}));

vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
  accessToken: 'token',
  scopes: [],
});

const setup = createFunctionMock(startThirdPartyAppsScan, 'third-party-apps/start');

describe('start-third-party-apps-scan', () => {
  test('should not scan third party apps page when organization could not be retrieved', async () => {
    const [result, { step }] = setup({
      tenantId: 'unknownId',
      isFirstScan: true,
    });
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should scan third party apps when organization has been retrieved', async () => {
    await db.insert(organizations).values(mockedOrganizations);

    // targeted installation
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test conviency
    const mockedOrganization = mockedOrganizations[0]!;
    const [result, { step, event }] = setup({
      tenantId: mockedOrganization.tenantId,
      isFirstScan: true,
    });

    await expect(result).resolves.toStrictEqual({
      id: '0',
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('scan-third-party-apps', {
      name: 'third-party-apps/scan',
      data: {
        tenantId: mockedOrganization.tenantId,
        organizationId: mockedOrganization.elbaOrganizationId,
        syncStartedAt: new Date(event.ts).toISOString(),
        isFirstScan: true,
        cursor: undefined,
      },
    });
  });
});
