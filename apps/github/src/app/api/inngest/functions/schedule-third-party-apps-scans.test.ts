import { expect, test, describe, vi } from 'vitest';
import { Installation, db } from '@/database';
import * as client from '../client';
import { handler } from './schedule-third-party-apps-scans';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  elbaOrganizationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));

vi.mock('../client', () => {
  return {
    inngest: {
      createFunction: vi.fn(),
      send: vi.fn(),
    },
  };
});

const setup = () => {
  const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });
  return [
    // @ts-expect-error -- this is a mock
    handler(),
    {
      inngest: {
        send,
      },
    },
  ] as const;
};

describe('schedule-third-party-apps-scans', () => {
  test('should not schedule any jobs when there are no installation', async () => {
    const [result, mocks] = setup();
    await expect(result).resolves.toStrictEqual({ installationIds: [] });
    expect(mocks.inngest.send).toBeCalledTimes(0);
  });

  test('should schedule jobs when there are installations', async () => {
    await db.insert(Installation).values(installations);
    const [result, mocks] = setup();

    await expect(result).resolves.toStrictEqual({
      installationIds,
    });

    expect(mocks.inngest.send).toBeCalledTimes(1);
    expect(mocks.inngest.send).toBeCalledWith(
      installations.map((installation) => ({
        name: 'third-party-apps/scan',
        data: { installationId: installation.id, isFirstScan: false },
      }))
    );
  });
});
