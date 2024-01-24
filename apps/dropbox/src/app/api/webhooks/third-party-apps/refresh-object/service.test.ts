import { expect, test, describe, vi } from 'vitest';
import { mockNextRequest } from '@/test-utils/mock-app-route';
import { POST as handler } from './route';
import { inngest } from '@/inngest/client';
import { insertOrganisations } from '@/test-utils/token';

const organisationId = '00000000-0000-0000-0000-000000000001';
const userId = 'team-member-id-1';
const appId = 'app-id-1';

describe('refreshThirdPartyAppsObject', () => {
  test('should throw an error when the specified organization does not exist.', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
    const response = mockNextRequest({
      handler,
      body: {
        organisationId,
        userId,
      },
    });

    expect(response).rejects.toThrowError(
      new Error(`Organisation not found with id=00000000-0000-0000-0000-000000000001`)
    );
    expect(send).toBeCalledTimes(0);
  });

  test('should send request to refresh third party objects', async () => {
    await insertOrganisations({});
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    const response = await mockNextRequest({
      handler,
      body: {
        organisationId,
        userId,
        appId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.json()).resolves.toStrictEqual({
      success: true,
    });

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'third-party-apps/refresh-objects',
      data: {
        organisationId,
        userId,
        appId,
        isFirstSync: true,
      },
    });
  });
});
