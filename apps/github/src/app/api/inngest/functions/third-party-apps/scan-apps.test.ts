import { expect, test, describe } from 'vitest';
import { NonRetriableError } from 'inngest';
import { Installation, InstallationAdmin, db } from '@/database';
import { createFunctionMock } from '../__mocks__/inngest';
import { scanApps } from './scan-apps';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  elbaOrganizationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));

const installationAdmins = Array.from({ length: 5 }, (_, i) => ({
  installationId: 0,
  adminId: `admin-id-${i}`,
  lastSyncAt: new Date(),
}));

const setup = createFunctionMock(scanApps, 'third-party-apps/scan');

describe('scan-apps', () => {
  test('should not scan apps page when installation could not be retrieved', async () => {
    const [result, { step }] = setup({
      installationId: 0,
      isFirstScan: true,
    });
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should scan apps page when installation has been retrieved', async () => {
    await db.insert(Installation).values(installations);
    await db.insert(InstallationAdmin).values(installationAdmins);

    // targeted installation
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test conviency
    const installation = installations[0]!;
    const [result, { step, event }] = setup({
      installationId: installation.id,
      isFirstScan: true,
    });

    await expect(result).resolves.toStrictEqual({
      installationId: 0,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('scan-apps-page', {
      name: 'third-party-apps/scan-page',
      data: {
        installationId: installation.id,
        organisationId: installation.elbaOrganizationId,
        accountLogin: installation.accountLogin,
        syncStartedAt: new Date(event.ts).toISOString(),
        adminsIds: installationAdmins.map(({ adminId }) => adminId),
        isFirstScan: true,
        cursor: null,
      },
    });
  });
});
