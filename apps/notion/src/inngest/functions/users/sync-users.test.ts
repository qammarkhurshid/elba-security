import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as usersConnector from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { env } from '@/env';
import { syncUsers } from './sync-users';

const organisation = {
  id: 'b91f113b-bcf9-4a28-98c7-5b13fb671c19',
  accessToken: env.NOTION_CLIENT_SECRET,
  workspaceId: '0b71731f-04a8-4d78-9be0-6b28b09ab4e4'
};

const syncStartedAt = new Date().toISOString();

const results = [
  {
    object: 'user',
    id: 'e876d211-bef9-4b40-a0d2-f862af5e017b',
    name: 'Syed Bilal',
    avatar_url: null,
    type: 'person',
    person: { email: 'syed.bilal@qbatch.com' }
  }
];

const nextCursorMoreUsers = 'more';
const nextCursorNoUsers = null;

const setup = createInngestFunctionMock(syncUsers, 'notion/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: true,
      syncStartedAt,
      page: '0',
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    await db.insert(Organisation).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      next_cursor: nextCursorMoreUsers,
      results,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: true,
      syncStartedAt,
      page: '0',
    });

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', {
      name: 'notion/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: true,
        syncStartedAt,
        page: nextCursorMoreUsers,
      },
    });
  });

  test('should finalize the sync when there is a no next page', async () => {
    await db.insert(Organisation).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      next_cursor: nextCursorNoUsers,
      results,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: true,
      syncStartedAt,
      page: nextCursorNoUsers,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
