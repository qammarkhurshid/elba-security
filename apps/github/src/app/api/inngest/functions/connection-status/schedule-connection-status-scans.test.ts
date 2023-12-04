import { expect, test, describe } from 'vitest';
import { Installation, Organisation, db } from '@/database';
import { createFunctionMock } from '../__mocks__/inngest';
import { scheduleConnectionStatusScans } from './schedule-connection-status-scans';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  organisationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));

const setup = createFunctionMock(scheduleConnectionStatusScans);

describe('schedule-connection-status-scans', () => {
  test('should not schedule any scans when there are no installation', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ installationIds: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule scans when there are installations', async () => {
    await db
      .insert(Organisation)
      .values(installations.map(({ organisationId }) => ({ id: organisationId })));
    await db.insert(Installation).values(installations);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      installationIds,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'scan-connection-status',
      installations.map((installation) => ({
        name: 'connection-status/scan',
        data: { installationId: installation.id, organisationId: installation.organisationId },
      }))
    );
  });
});
