import { expect, test, describe } from 'vitest';
import { eq } from 'drizzle-orm';
import { Installation, Organisation, db } from '@/database';
import { handleGithubWebhookEvent } from './service';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  organisationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));

describe('handleGithubWebhookEvent', () => {
  test('should ignore event when its not supported', async () => {
    // @ts-expect-error -- this is a mock
    await expect(handleGithubWebhookEvent({ action: 'foo' })).resolves.toStrictEqual({
      ignored: true,
    });
  });

  test('should throws when installation related to the event is not found', async () => {
    await expect(
      // @ts-expect-error -- this is a mock
      handleGithubWebhookEvent({ action: 'deleted', installation: { id: 12 } })
    ).rejects.toThrowError(`Installation with id=12 not found`);
  });

  test('should suspend installation when event action is suspend', async () => {
    await db
      .insert(Organisation)
      .values(installations.map(({ organisationId }) => ({ id: organisationId })));
    await db.insert(Installation).values(installations);
    await expect(
      // @ts-expect-error -- this is a mock
      handleGithubWebhookEvent({ action: 'suspend', installation: { id: 0 } })
    ).resolves.toStrictEqual({ success: true });
    await expect(
      db
        .select({ suspended_at: Installation.suspendedAt })
        .from(Installation)
        .where(eq(Installation.id, 0))
    ).resolves.toStrictEqual([expect.not.objectContaining({ suspended_at: null })]);
  });

  test('should unsuspend installation when event action is unsuspend', async () => {
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
    await expect(
      // @ts-expect-error -- this is a mock
      handleGithubWebhookEvent({ action: 'unsuspend', installation: { id: 0 } })
    ).resolves.toStrictEqual({ success: true });
    await expect(
      db
        .select({ suspended_at: Installation.suspendedAt })
        .from(Installation)
        .where(eq(Installation.id, 0))
    ).resolves.toMatchObject([{ suspended_at: null }]);
  });

  test('should delete installation when event action is delete', async () => {
    await db
      .insert(Organisation)
      .values(installations.map(({ organisationId }) => ({ id: organisationId })));
    await db.insert(Installation).values(installations);
    await expect(
      // @ts-expect-error -- this is a mock
      handleGithubWebhookEvent({ action: 'deleted', installation: { id: 0 } })
    ).resolves.toStrictEqual({ success: true });
    await expect(
      db
        .select({ suspended_at: Installation.suspendedAt })
        .from(Installation)
        .where(eq(Installation.id, 0))
    ).resolves.toHaveLength(0);
  });
});
