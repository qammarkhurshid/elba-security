import { expect, test, describe } from 'vitest';
import { NonRetriableError } from 'inngest';
import { Installation, Organisation, db } from '@/database';
import { createFunctionMock } from '../__mocks__/inngest';
import { scanUsers } from './scan-users';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  organisationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));

const setup = createFunctionMock(scanUsers, 'users/scan');

describe('scan-users', () => {
  test('should not scan users page when installation could not be retrieved', async () => {
    const [result, { step }] = setup({
      installationId: 0,
      isFirstScan: true,
    });
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should scan users when installation has been retrieved', async () => {
    await db
      .insert(Organisation)
      .values(installations.map(({ organisationId }) => ({ id: organisationId })));
    await db.insert(Installation).values(installations);

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
    expect(step.sendEvent).toBeCalledWith('scan-users-page', {
      name: 'users/scan-page',
      data: {
        installationId: installation.id,
        organisationId: installation.organisationId,
        accountLogin: installation.accountLogin,
        syncStartedAt: new Date(event.ts).toISOString(),
        isFirstScan: true,
        cursor: null,
      },
    });
  });
});
