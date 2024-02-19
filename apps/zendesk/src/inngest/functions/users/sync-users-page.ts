import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { createElbaClient } from '@/connectors/elba/client';

type EventData = {
    organisationId: string;
    region: string;
    syncStartedAt: Date;
    authToken: string;
    pageUrl: string;
}


export const syncUsersPage = inngest.createFunction(
  {
    id: 'zendesk-sync-users',
  },
  { event: 'zendesk/users.sync.triggered' },
  async ({ event, step }) => {
    const { organisationId, /* region, syncStartedAt, authToken, */ pageUrl } = event.data as EventData;
    
    const [organisation] = await db.select({
      auth_token: Organisation.auth_token,
      region: Organisation.region
    }).from(Organisation).where(eq(Organisation.id, organisationId));

    if (!organisation?.auth_token) {
      throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
    }

    const result = await getUsers(organisation.auth_token, pageUrl);
    const elba = createElbaClient(organisationId, organisation.region);
    
    const users = result.users.map(user =>{
      return {
        id: String(user.id),
        displayName: user.name,
        email: user.email,
        additionalEmails: [],
      }
    });

    await elba.users.update({ users });

    if (result.next_page) {
      await step.sendEvent('sync-users-page', {
        name: 'zendesk/users.sync.triggered',
        data: {
          ...event.data,
          pageUrl: result.next_page,
        } as EventData,
      });
      
      return {
        status: 'ongoing'
      }
    }

    return {
      validUsers: users
    };
  }
);
