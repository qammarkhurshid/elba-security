import { expect, test, describe, vi, afterEach } from 'vitest';
import * as slack from 'slack-web-api-client';
import * as elba from '@elba-security/sdk';
import { createFunctionMock } from '@/inngest/__mocks__/inngest';
import { db } from '@/database/client';
import { conversations, teams } from '@/database/schema';
import { synchronizeConversationThreadMessages } from './synchronize-conversation-thread-messages';

vi.mock('slack-web-api-client');

const setup = createFunctionMock(
  synchronizeConversationThreadMessages,
  'conversations/synchronize.thread.messages'
);

describe('synchronize-conversation-thread-messages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should properly synchronize messages and handle pagination', async () => {
    const repliesMock = vi.fn().mockResolvedValue({
      ok: true,
      messages: [
        {
          type: 'message',
          team: 'team-id',
          ts: '1700000001.000000',
          user: 'user',
          text: 'text1',
        },
        {
          type: 'message',
          team: 'team-id',
          ts: '1700000002.000000',
          user: 'user',
          edited: {
            ts: '1700000003.000000',
          },
          text: 'text2',
        },
      ],
      headers: new Headers(),
      response_metadata: {
        next_cursor: 'next-cursor',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.replies>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      conversations: {
        replies: repliesMock,
      },
    });

    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      vi.spyOn(client.dataProtection, 'updateObjects');
      return client;
    });

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });
    await db.insert(conversations).values({
      id: 'conversation-id',
      isSharedExternally: false,
      lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
      name: 'conversation',
      teamId: 'team-id',
    });

    const [result, { step }] = setup({
      teamId: 'team-id',
      conversationId: 'conversation-id',
      threadId: 'thread-id',
      isFirstSync: true,
    });

    await expect(result).resolves.toStrictEqual({ objects: 2, nextCursor: 'next-cursor' });

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('token');

    expect(repliesMock).toBeCalledTimes(1);
    expect(repliesMock).toBeCalledWith({
      channel: 'conversation-id',
      latest: undefined,
      limit: 2,
      ts: 'thread-id',
    });

    expect(elbaMock).toBeCalledTimes(1);
    expect(elbaMock).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      sourceId: '00000000-0000-0000-0000-000000000000',
    });

    const elbaClientMock = elbaMock.mock.results[0]?.value as elba.Elba;
    expect(elbaClientMock).toBeInstanceOf(ElbaClient);
    expect(elbaClientMock.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaClientMock.dataProtection.updateObjects).toBeCalledWith({
      objects: [
        {
          id: '["team-id","conversation-id","1700000001.000000"]',
          metadata: {
            channelId: 'conversation-id',
            messageId: '1700000001.000000',
            teamId: 'team-id',
            type: 'reply',
          },
          name: 'Sent on 2023-11-14T22:13:21.000Z #conversation',
          ownerId: 'user',
          permissions: [
            {
              id: 'anyone',
              type: 'anyone',
            },
          ],
          updatedAt: undefined,
          url: 'https://url/archives/conversation-id/p1700000001000000?thread_ts=thread-id&cid=conversation-id',
        },
        {
          id: '["team-id","conversation-id","1700000002.000000"]',
          metadata: {
            channelId: 'conversation-id',
            messageId: '1700000002.000000',
            teamId: 'team-id',
            type: 'reply',
          },
          name: 'Sent on 2023-11-14T22:13:22.000Z #conversation',
          ownerId: 'user',
          permissions: [
            {
              id: 'anyone',
              type: 'anyone',
            },
          ],
          updatedAt: '2023-11-14T22:13:23.000Z',
          url: 'https://url/archives/conversation-id/p1700000002000000?thread_ts=thread-id&cid=conversation-id',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('next-pagination-cursor', {
      data: {
        conversationId: 'conversation-id',
        cursor: 'next-cursor',
        isFirstSync: true,
        teamId: 'team-id',
        threadId: 'thread-id',
      },
      name: 'conversations/synchronize.thread.messages',
    });
  });

  test('should properly synchronize messages and end when pagination is over', async () => {
    const repliesMock = vi.fn().mockResolvedValue({
      ok: true,
      messages: [
        {
          type: 'message',
          team: 'unknown-team-id',
          ts: '1700000001.000000',
          user: 'user',
          text: 'text1',
        },
        {
          type: 'message',
          team: 'team-id',
          ts: '1700000002.000000',
          user: 'user',
          edited: {
            ts: '1700000003.000000',
          },
          text: 'text2',
        },
      ],
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.replies>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      conversations: {
        replies: repliesMock,
      },
    });

    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      vi.spyOn(client.dataProtection, 'updateObjects');
      return client;
    });

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });
    await db.insert(conversations).values({
      id: 'conversation-id',
      isSharedExternally: false,
      lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
      name: 'conversation',
      teamId: 'team-id',
    });

    const [result, { step }] = setup({
      teamId: 'team-id',
      conversationId: 'conversation-id',
      threadId: 'thread-id',
      isFirstSync: false,
      cursor: 'cursor',
    });

    await expect(result).resolves.toStrictEqual({ objects: 1, nextCursor: undefined });

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('token');

    expect(repliesMock).toBeCalledTimes(1);
    expect(repliesMock).toBeCalledWith({
      channel: 'conversation-id',
      cursor: 'cursor',
      limit: 2,
      ts: 'thread-id',
    });

    expect(elbaMock).toBeCalledTimes(1);
    expect(elbaMock).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      sourceId: '00000000-0000-0000-0000-000000000000',
    });

    const elbaClientMock = elbaMock.mock.results[0]?.value as elba.Elba;
    expect(elbaClientMock).toBeInstanceOf(ElbaClient);
    expect(elbaClientMock.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaClientMock.dataProtection.updateObjects).toBeCalledWith({
      objects: [
        {
          id: '["team-id","conversation-id","1700000002.000000"]',
          metadata: {
            channelId: 'conversation-id',
            messageId: '1700000002.000000',
            teamId: 'team-id',
            type: 'reply',
          },
          name: 'Sent on 2023-11-14T22:13:22.000Z #conversation',
          ownerId: 'user',
          permissions: [
            {
              id: 'anyone',
              type: 'anyone',
            },
          ],
          updatedAt: '2023-11-14T22:13:23.000Z',
          url: 'https://url/archives/conversation-id/p1700000002000000?thread_ts=thread-id&cid=conversation-id',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('thread-sync-complete', {
      data: {
        conversationId: 'conversation-id',
        teamId: 'team-id',
        threadId: 'thread-id',
      },
      name: 'conversations/synchronize.thread.messages.complete',
    });
  });
});
