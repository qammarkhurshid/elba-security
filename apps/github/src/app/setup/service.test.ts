import { expect, test, describe, vi } from 'vitest';
import { Installation, db } from '@/database';
import * as installationRepository from '@/repositories/github/installation';
import * as client from '../api/inngest/client';
import { setupInstallation } from './service';

const installationId = 1;
const organisationId = `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`;

vi.mock('../client', () => {
  return {
    inngest: {
      send: vi.fn(),
    },
  };
});

const setup = (...params: Parameters<typeof setupInstallation>) => {
  const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });
  return [
    setupInstallation(...params),
    {
      inngest: {
        send,
      },
    },
  ] as const;
};

describe('schedule-users-sync-jobs', () => {
  test('should not setup installation when github account is not an organization', async () => {
    vi.spyOn(installationRepository, 'getInstallation').mockResolvedValue({
      id: installationId,
      account: {
        id: 1,
        type: 'PERSONNAL',
        login: 'some-login',
      },
      suspended_at: null,
    });
    const [result, mocks] = setup(installationId, organisationId);

    await expect(result).rejects.toThrow(
      new Error('Cannot install elba github app on an account that is not an organization')
    );
    await expect(db.select().from(Installation)).resolves.toHaveLength(0);
    expect(mocks.inngest.send).toBeCalledTimes(0);
  });

  test('should not setup installation when github account is suspended', async () => {
    vi.spyOn(installationRepository, 'getInstallation').mockResolvedValue({
      id: installationId,
      account: {
        id: 1,
        type: 'Organization',
        login: 'some-login',
      },
      suspended_at: new Date().toISOString(),
    });
    const [result, mocks] = setup(installationId, organisationId);

    await expect(result).rejects.toThrow(new Error('Installation is suspended'));
    await expect(db.select().from(Installation)).resolves.toHaveLength(0);
    expect(mocks.inngest.send).toBeCalledTimes(0);
  });

  test('should setup installation when github account is not suspended and is an Organization', async () => {
    vi.spyOn(installationRepository, 'getInstallation').mockResolvedValue({
      id: 1,
      account: {
        id: 1,
        type: 'Organization',
        login: 'some-login',
      },
      suspended_at: null,
    });
    const [result, mocks] = setup(installationId, organisationId);
    const installation = {
      id: installationId,
      organisationId,
      accountId: 1,
      accountLogin: 'some-login',
    };

    await expect(result).resolves.toMatchObject(installation);
    await expect(db.select().from(Installation)).resolves.toMatchObject([installation]);
    expect(mocks.inngest.send).toBeCalledTimes(1);
    expect(mocks.inngest.send).toBeCalledWith({
      name: 'users/scan',
      data: {
        installationId: installation.id,
        isFirstScan: true,
      },
    });
  });
});
