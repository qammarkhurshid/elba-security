import { expect, test, describe } from 'vitest';
import { Installation, db } from '@/database';
import { createFunctionMock } from '../__mocks__/inngest';
import { scheduleUsersScans } from './schedule-users-scans';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  elbaOrganizationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));

const setup = createFunctionMock(scheduleUsersScans);

describe('schedule-users-sync-jobs', () => {
  test('should not schedule any jobs when there are no installation', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ installationIds: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule jobs when there are installations', async () => {
    await db.insert(Installation).values(installations);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      installationIds,
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'scan-users',
      installations.map((installation) => ({
        name: 'users/scan',
        data: { installationId: installation.id, isFirstScan: false },
      }))
    );
  });
});
