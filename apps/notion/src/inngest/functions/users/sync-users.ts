import { eq } from 'drizzle-orm';
import { NonRetriableError } from 'inngest';
import { elbaAccess } from '@/connectors/elba';
import { type NotionUser, type ElbaUser, getUsers } from '@/connectors/users';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';

const formatElbaUser = (user: NotionUser): ElbaUser => ({
  id: user.id,
  displayName: user.name,
  email: user.person.email,
  additionalEmails: [],
});

export const syncUsers = inngest.createFunction(
  {
    id: 'synchronize-users',
    priority: { run: 'event.data.is_first_scan ? 600 : -600' },
  }, {
    event: 'notion/users.sync.requested'
  },
  async ({ event, step }) => {
    const { organisationId, syncStartedAt, page } = event.data;

    const elba = elbaAccess(organisationId);

    const token = await step.run('get-token', async () => {
      const [organisation] = await db
        .select({ token: Organisation.accessToken })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId));

      if (!organisation) {
        throw new NonRetriableError(`Could not retrieve organisation with id=${organisationId}`);
      }

      return organisation.token;
    });

    const nextPage = await step.run('list-users', async () => {
      const result = await getUsers(
        token,
        page,
      );

      const { next_cursor: nextPageCursor } = result;

      const users = result.results.filter((user) => user.object === 'user' && user.type === 'person').map(formatElbaUser);
      await elba.users.update({ users });

      return nextPageCursor;
    });

    if (nextPage) {
      await step.sendEvent('synchronize-users', {
        name: 'notion/users.sync.requested',
        data: {
          ...event.data,
          page: nextPage,
        },
      });

      return {
        status: 'ongoing',
      };
    }

    await elba.users.delete({
      syncedBefore: syncStartedAt
    });

    return {
      status: 'completed',
    }
  }
);
