import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as authConnector from '@/connectors/auth';
import * as usersConnector from '@/connectors/users';
import { syncUsers } from '../../inngest/functions/users/sync-users';
import { setupOrganisation } from './service';

const invalidCode = 'invalid_code_abc';

const token = env.NOTION_CLIENT_SECRET;
const now = new Date();
const syncStartedAt = now.toISOString();
const organisation = {
  id: 'b91f113b-bcf9-4a28-98c7-5b13fb671c19',
  accessToken: token,
  workspaceId: '0b71731f-04a8-4d78-9be0-6b28b09ab4e4'
};

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

const setup = createInngestFunctionMock(syncUsers, 'notion/users.sync.requested');

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the code is valid and the organisation is not registered', async () => {
    await db.insert(Organisation).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      next_cursor: null,
      results,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: true,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    await expect(
      db
        .select({ token: Organisation.accessToken })
        .from(Organisation)
        .where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token,
      },
    ]);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    await db.insert(Organisation).values(organisation);
    vi.spyOn(usersConnector, 'getUsers').mockResolvedValue({
      next_cursor: null,
      results,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: true,
      syncStartedAt,
      page: null,
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    await expect(
      db
        .select({ token: Organisation.accessToken })
        .from(Organisation)
        .where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token,
      },
    ]);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should not setup the organisation when the code is invalid', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('Could not retrieve token');
    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);

    await expect(setupOrganisation(organisation.id, invalidCode)).rejects.toThrowError(error);

    expect(getToken).toBeCalledTimes(1);

    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
