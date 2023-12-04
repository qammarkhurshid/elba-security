import { expect, test, describe, vi } from 'vitest';
import { RequestError } from '@octokit/request-error';
import { eq } from 'drizzle-orm';
import { Installation, Organisation, db } from '@/database';
import * as installationRepository from '@/repositories/github/installation';
import { createFunctionMock } from '../__mocks__/inngest';
import { scanConnectionStatus } from './scan-connection-status';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  organisationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));

const setup = createFunctionMock(scanConnectionStatus, 'connection-status/scan');

describe('scan-connection-status', () => {
  test('should delete installation when Github installation does not exists', async () => {
    await db
      .insert(Organisation)
      .values(installations.map(({ organisationId }) => ({ id: organisationId })));
    await db.insert(Installation).values(installations);
    vi.spyOn(installationRepository, 'getInstallation').mockRejectedValue(
      new RequestError('foo bar', 404, {
        // @ts-expect-error this is a mock
        response: {},
        request: { method: 'GET', url: 'http://foo.bar', headers: {} },
      })
    );
    const [result] = setup({
      installationId: 0,
      organisationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
    });
    await expect(result).resolves.toStrictEqual({ installationId: 0 });
    await expect(
      db.select().from(Installation).where(eq(Installation.id, 0))
    ).resolves.toHaveLength(0);
  });

  test('should suspend installation when Github installation is suspended', async () => {
    await db
      .insert(Organisation)
      .values(installations.map(({ organisationId }) => ({ id: organisationId })));
    await db.insert(Installation).values(installations);
    const suspendedAt = new Date();
    suspendedAt.setMilliseconds(0);
    vi.spyOn(installationRepository, 'getInstallation').mockResolvedValue({
      id: 0,
      suspended_at: suspendedAt.toISOString(),
      account: {
        login: 'foo',
        type: 'ORGANIZATION',
        id: 0,
      },
    });
    const [result] = setup({
      installationId: 0,
      organisationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
    });
    await expect(result).resolves.toStrictEqual({ installationId: 0 });
    await expect(
      db
        .select({ suspendedAt: Installation.suspendedAt })
        .from(Installation)
        .where(eq(Installation.id, 0))
    ).resolves.toMatchObject([{ suspendedAt }]);
  });

  test('should unsuspend installation when Github installation is unsuspended', async () => {
    const [firstInstallation, ...otherInstallations] = installations;
    await db
      .insert(Organisation)
      .values(installations.map(({ organisationId }) => ({ id: organisationId })));
    await db.insert(Installation).values([
      {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- conveniency
        ...firstInstallation!,
        suspendedAt: new Date(),
      },
      ...otherInstallations,
    ]);
    vi.spyOn(installationRepository, 'getInstallation').mockResolvedValue({
      id: 0,
      suspended_at: null,
      account: {
        login: 'foo',
        type: 'ORGANIZATION',
        id: 0,
      },
    });
    const [result] = setup({
      installationId: 0,
      organisationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
    });
    await expect(result).resolves.toStrictEqual({ installationId: 0 });
    await expect(
      db
        .select({ suspended_at: Installation.suspendedAt })
        .from(Installation)
        .where(eq(Installation.id, 0))
    ).resolves.toMatchObject([{ suspended_at: null }]);
  });
});
