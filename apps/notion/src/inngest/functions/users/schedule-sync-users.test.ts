import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { env } from '@/env';
import { Organisation } from '@/database/schema';
import { scheduleSyncUsers } from './schedule-sync-users';

const organisation = {
  id: 'b91f113b-bcf9-4a28-98c7-5b13fb671c19',
  accessToken: env.NOTION_CLIENT_SECRET,
  workspaceId: '0b71731f-04a8-4d78-9be0-6b28b09ab4e4'
};

const setup = createInngestFunctionMock(scheduleSyncUsers);

describe('schedule-sync-users', () => {
  test('should abort sync when there is not any organisation', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toBeCalledTimes(1);
  });

  test('should sync when there is/are organisations', async () => {
    await db.insert(Organisation).values(organisation);
    
    const [result, { step }] = setup();
    await expect(result).resolves.toBeUndefined();
    
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-users', [{
      name: 'notion/users.sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt: new Date().toISOString(),
        page: null,
      },
    }]);
  });
});
