import { EventSchemas, Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'notion-app',
  schemas: new EventSchemas().fromRecord<{
    'notion/users.sync.requested': {
      data: {
        isFirstSync: boolean;
        organisationId: string;
        syncStartedAt: string;
        page: string | null;
      };
    };
    'request-organisations-users-sync': {
      // No Params
    };
  }>()
});
