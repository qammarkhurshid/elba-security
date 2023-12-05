import { SlackAPIClient } from 'slack-web-api-client';
import { and, eq, lt, sql } from 'drizzle-orm';
import type { DataProtectionObject } from '@elba-security/sdk';
import { inngest } from '@/inngest/client';
import {
  conversations as conversationsTable,
  teams as teamsTable,
  type NewConversation,
} from '@/database/schema';
import { db } from '@/database/client';
import { slackMessageSchema } from '@/repositories/slack/messages';
import { formatDataProtectionObject } from '@/repositories/elba/data-protection/objects';
import { createElbaClient } from '@/repositories/elba/client';

export type ConversationsEvents = {
  'conversations/synchronize': ConversationsSync;
  'conversations/synchronize.messages': ConversationMessagesSync;
  'conversations/synchronize.messages.complete': ConversationMessagesSyncComplete;
  'conversations/synchronize.thread.messages': ConversationThreadMessagesSync;
  'conversations/synchronize.thread.messages.complete': ConversationThreadMessagesSyncComplete;
};

type ConversationsSync = {
  data: {
    teamId: string;
    syncStartedAt: string;
    isFirstSync: boolean;
    cursor?: string;
  };
};

export const synchronizeSlackConversations = inngest.createFunction(
  {
    id: 'synchronize-conversations',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    retries: 5,
  },
  {
    event: 'conversations/synchronize',
  },
  async ({
    event: {
      data: { teamId, isFirstSync, syncStartedAt, cursor },
    },
    step,
  }) => {
    const { token, elbaOrganisationId } = await step.run('get-token', async () => {
      const result = await db.query.teams.findFirst({
        where: eq(teamsTable.id, teamId),
        columns: { token: true, elbaOrganisationId: true },
      });

      if (!result) {
        throw new Error('Failed to find team');
      }

      return result;
    });

    const { conversations, nextCursor } = await step.run('list-conversations', async () => {
      const slackWebClient = new SlackAPIClient(token);
      const { channels, response_metadata: responseMetadata } =
        await slackWebClient.conversations.list({
          exclude_archived: true,
          cursor,
          limit: 2,
          // limit: 200,
          types: 'public_channel', // We only support public channels for now
        });

      if (!channels) {
        throw new Error('An error occurred while listing slack conversations');
      }

      return { conversations: channels, nextCursor: responseMetadata?.next_cursor };
    });

    const conversationsToInsert: NewConversation[] = [];
    for (const conversation of conversations) {
      if (conversation.id && conversation.name) {
        conversationsToInsert.push({
          teamId,
          id: conversation.id,
          name: conversation.name,
          isSharedExternally: Boolean(conversation.is_ext_shared),
          lastSyncedAt: new Date(),
        });
      }
    }

    if (conversationsToInsert.length) {
      await step.run('insert-conversations', async () => {
        await db
          .insert(conversationsTable)
          .values(conversationsToInsert)
          .onConflictDoUpdate({
            target: [conversationsTable.teamId, conversationsTable.id],
            set: {
              name: sql`excluded.name`,
              isSharedExternally: sql`excluded.is_shared_externally`,
              lastSyncedAt: new Date(),
            },
          });
      });

      const eventsToWait = conversationsToInsert.map(({ id: conversationId }) =>
        step.waitForEvent(`wait-for-message-complete-${conversationId}`, {
          event: 'conversations/synchronize.messages.complete',
          timeout: '1 day',
          if: `async.data.teamId == '${teamId}' && async.data.conversationId == '${conversationId}'`,
        })
      );

      await step.sendEvent(
        'start-conversations-messages-synchronization',
        conversationsToInsert.map(({ id: conversationId }) => ({
          name: 'conversations/synchronize.messages',
          data: { teamId, conversationId, isFirstSync },
        }))
      );

      await Promise.all(eventsToWait);
      console.log('--- OVER ---');
    }

    if (nextCursor) {
      await step.sendEvent('next-pagination-cursor', {
        name: 'conversations/synchronize',
        data: { teamId, syncStartedAt, isFirstSync, cursor: nextCursor },
      });
    } else {
      await step.run('delete-conversations', async () => {
        await db
          .delete(conversationsTable)
          .where(
            and(
              eq(conversationsTable.teamId, teamId),
              lt(conversationsTable.lastSyncedAt, new Date(syncStartedAt))
            )
          );
      });

      const elbaClient = createElbaClient(elbaOrganisationId);
      await elbaClient.dataProtection.deleteObjects({ syncedBefore: syncStartedAt });
    }

    return { conversationsToInsert, nextCursor };
  }
);

type ConversationMessagesSync = {
  data: {
    teamId: string;
    isFirstSync: boolean;
    conversationId: string;
    cursor?: string;
  };
};

type ConversationMessagesSyncComplete = {
  data: {
    teamId: string;
    conversationId: string;
  };
};

export const synchronizeSlackConversationMessages = inngest.createFunction(
  {
    id: 'synchronize-conversation-messages',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      limit: 3,
      key: 'event.data.teamId',
    },
    retries: 5,
  },
  {
    event: 'conversations/synchronize.messages',
  },
  async ({
    event: {
      data: { teamId, isFirstSync, conversationId, cursor },
    },
    step,
  }) => {
    const conversation = await step.run('get-conversation', async () => {
      const result = await db.query.conversations.findFirst({
        with: {
          team: {
            columns: {
              elbaOrganisationId: true,
              url: true,
              token: true,
            },
          },
        },
        where: and(
          eq(conversationsTable.teamId, teamId),
          eq(conversationsTable.id, conversationId)
        ),
        columns: {
          name: true,
        },
      });

      if (!result) {
        throw new Error('Failed to find conversation');
      }

      return result;
    });

    const { messages, nextCursor } = await step.run('get-messages', async () => {
      const slackWebClient = new SlackAPIClient(conversation.team.token);
      const { messages: responseMessages, response_metadata: responseMetadata } =
        await slackWebClient.conversations.history({
          channel: conversationId,
          latest: cursor || undefined,
          limit: 2,
          // limit: 200,
          cursor,
        });

      if (!responseMessages) {
        throw new Error('An error occurred while listing slack conversations');
      }

      return { messages: responseMessages, nextCursor: responseMetadata?.next_cursor };
    });

    const objects: DataProtectionObject[] = [];
    const threadIds: string[] = [];
    for (const message of messages) {
      if (message.thread_ts) {
        threadIds.push(message.thread_ts);
      }

      const result = slackMessageSchema.safeParse(message);
      if (message.type !== 'message' || message.team !== teamId || !result.success) {
        // console.log({
        //   message: 'IGNORED',
        //   type: message.type,
        //   team: message.team === teamId,
        //   success: result.success,
        //   messageData: message,
        // });
        continue;
      }

      // console.log(message);

      const object = formatDataProtectionObject({
        teamId,
        teamUrl: conversation.team.url,
        conversationId,
        conversationName: conversation.name,
        message: result.data,
      });

      objects.push(object);
    }

    const elbaClient = createElbaClient(conversation.team.elbaOrganisationId);
    await elbaClient.dataProtection.updateObjects({ objects });

    if (threadIds.length) {
      console.log({ threadIds });
      const eventsToWait = threadIds.map(async (threadId) => {
        return step.waitForEvent(`wait-for-thread-message-sync-complete-${threadId}`, {
          event: 'conversations/synchronize.thread.messages.complete',
          timeout: '1d',
          if: `async.data.teamId == '${teamId}' && async.data.conversationId == '${conversationId}' && async.data.threadId == '${threadId}'`,
        });
        // console.log(`------ conv ${conversationId} thread ${threadId} ------`);
      });

      // console.log({ conversationId, threadIds });
      // const promises = threadIds.map((threadId) => {
      //   return step.waitForEvent('wait-for-thread-message-sync-complete', {
      //     event: 'conversations/synchronize.thread.messages.complete',
      //     timeout: '1d',
      //     if: `async.data.teamId == '${teamId}' && async.data.conversationId == '${conversationId}' && async.data.threadId == '${threadId}'`,
      //   });
      // });

      // await new Promise((resolve) => setTimeout(resolve, 1));

      // await step.sleep('sleep', 3000);
      await step.sendEvent(
        'start-conversation-thread-messages-synchronization',
        threadIds.map((threadId) => ({
          name: 'conversations/synchronize.thread.messages',
          data: { teamId, conversationId, threadId, isFirstSync },
        }))
      );

      await Promise.all(eventsToWait);
    }

    if (nextCursor) {
      await step.sendEvent('next-pagination-cursor', {
        name: 'conversations/synchronize.messages',
        data: { teamId, conversationId, isFirstSync, cursor: nextCursor },
      });
    } else {
      // await step.run('over', async () => {
      //   console.log(`--- OVER ${conversationId} ---`);
      // });
      await step.sendEvent('conversation-sync-complete', {
        name: 'conversations/synchronize.messages.complete',
        data: { teamId, conversationId },
      });
    }

    return { threadIds, objects: objects.length, nextCursor };
  }
);

type ConversationThreadMessagesSync = {
  data: {
    teamId: string;
    isFirstSync: boolean;
    conversationId: string;
    threadId: string;
    cursor?: string;
  };
};

type ConversationThreadMessagesSyncComplete = {
  data: {
    teamId: string;
    conversationId: string;
    threadId: string;
    cursor?: string;
  };
};

export const synchronizeSlackConversationThreadMessages = inngest.createFunction(
  {
    id: 'synchronize-conversation-thread-messages',
    priority: {
      run: 'event.data.isFirstSync ? 600 : 0',
    },
    concurrency: {
      limit: 3,
      key: 'event.data.teamId',
    },
    retries: 5,
  },
  {
    event: 'conversations/synchronize.thread.messages',
  },
  async ({
    event: {
      data: { teamId, isFirstSync, conversationId, threadId, cursor },
    },
    step,
  }) => {
    const conversation = await db.query.conversations.findFirst({
      with: {
        team: {
          columns: {
            elbaOrganisationId: true,
            url: true,
            token: true,
          },
        },
      },
      where: and(eq(conversationsTable.teamId, teamId), eq(conversationsTable.id, conversationId)),
      columns: {
        name: true,
      },
    });

    if (!conversation) {
      throw new Error('Failed to find conversation');
    }

    const slackWebClient = new SlackAPIClient(conversation.team.token);

    const { messages, response_metadata: responseMetadata } =
      await slackWebClient.conversations.replies({
        channel: conversationId,
        ts: threadId,
        latest: cursor || undefined,
        limit: 2,
        // limit: 1000,
      });

    if (!messages) {
      throw new Error('An error occurred while listing slack conversations');
    }

    const objects: DataProtectionObject[] = [];
    for (const message of messages) {
      const result = slackMessageSchema.safeParse(message);

      if (message.type !== 'message' || message.team !== teamId || !result.success) {
        continue;
      }

      const object = formatDataProtectionObject({
        teamId,
        teamUrl: conversation.team.url,
        conversationId,
        conversationName: conversation.name,
        threadId,
        message: result.data,
      });

      objects.push(object);
    }

    const elbaClient = createElbaClient(conversation.team.elbaOrganisationId);
    await elbaClient.dataProtection.updateObjects({ objects });

    const nextCursor = responseMetadata?.next_cursor;
    if (nextCursor) {
      await step.sendEvent('next-pagination-cursor', {
        name: 'conversations/synchronize.thread.messages',
        data: {
          teamId,
          conversationId,
          threadId,
          isFirstSync,
          cursor: nextCursor,
        },
      });
    } else {
      await step.sendEvent('thread-sync-complete', {
        name: 'conversations/synchronize.thread.messages.complete',
        data: { teamId, conversationId, threadId },
      });
    }

    return { objects: objects.length, nextCursor };
  }
);

export const conversationsFunctions = [
  synchronizeSlackConversations,
  synchronizeSlackConversationMessages,
  synchronizeSlackConversationThreadMessages,
];
