import { expect, test, describe, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { createFunctionMock } from '@/inngest/__mocks__/inngest';
import { db } from '@/database/client';
import { conversations, teams } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { synchronizeConversationMessages } from './synchronize-conversation-messages';
import * as slack from 'slack-web-api-client';
import * as elba from '@elba-security/sdk';

vi.mock('slack-web-api-client');

const setup = createFunctionMock(
  synchronizeConversationMessages,
  'conversations/synchronize.messages'
);

describe('synchronize-conversation-messages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should properly synchronize messages and handle pagination', async () => {
    const historyMock = vi.fn().mockResolvedValue({
      ok: true,
      messages: [
        {
          type: 'message',
          team: 'team-id',
          ts: '1700000001.000000',
          user: 'user',
          text: 'text1',
          thread_ts: 'thread-id',
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
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.history>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      conversations: {
        history: historyMock,
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
      isFirstSync: true,
    });

    await expect(result).resolves.toStrictEqual({
      objects: 2,
      nextCursor: 'next-cursor',
      threadIds: ['thread-id'],
    });

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('token');

    expect(historyMock).toBeCalledTimes(1);
    expect(historyMock).toBeCalledWith({
      channel: 'conversation-id',
      limit: 2,
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
            type: 'message',
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
          url: 'https://url/archives/conversation-id/p1700000001000000',
        },
        {
          id: '["team-id","conversation-id","1700000002.000000"]',
          metadata: {
            channelId: 'conversation-id',
            messageId: '1700000002.000000',
            teamId: 'team-id',
            type: 'message',
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
          url: 'https://url/archives/conversation-id/p1700000002000000',
        },
      ],
    });

    expect(step.waitForEvent).toBeCalledTimes(1);
    expect(step.waitForEvent).toBeCalledWith('wait-for-thread-message-sync-complete-thread-id', {
      event: 'conversations/synchronize.thread.messages.complete',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'conversation-id' && async.data.threadId == 'thread-id'",
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('start-conversation-thread-messages-synchronization', [
      {
        data: {
          conversationId: 'conversation-id',
          isFirstSync: true,
          teamId: 'team-id',
          threadId: 'thread-id',
        },
        name: 'conversations/synchronize.thread.messages',
      },
    ]);
    expect(step.sendEvent).toBeCalledWith('next-pagination-cursor', {
      data: {
        conversationId: 'conversation-id',
        cursor: 'next-cursor',
        isFirstSync: true,
        teamId: 'team-id',
      },
      name: 'conversations/synchronize.messages',
    });
  });

  test('should properly synchronize messages and end when pagination is over', async () => {
    const historyMock = vi.fn().mockResolvedValue({
      ok: true,
      messages: [
        {
          type: 'message',
          team: 'team-id',
          ts: '1700000001.000000',
          user: 'user',
          text: 'text1',
          thread_ts: 'thread-id',
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
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.history>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      conversations: {
        history: historyMock,
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
      isFirstSync: false,
      cursor: 'cursor',
    });

    await expect(result).resolves.toStrictEqual({
      objects: 2,
      nextCursor: undefined,
      threadIds: ['thread-id'],
    });

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('token');

    expect(historyMock).toBeCalledTimes(1);
    expect(historyMock).toBeCalledWith({
      channel: 'conversation-id',
      limit: 2,
      cursor: 'cursor',
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
            type: 'message',
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
          url: 'https://url/archives/conversation-id/p1700000001000000',
        },
        {
          id: '["team-id","conversation-id","1700000002.000000"]',
          metadata: {
            channelId: 'conversation-id',
            messageId: '1700000002.000000',
            teamId: 'team-id',
            type: 'message',
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
          url: 'https://url/archives/conversation-id/p1700000002000000',
        },
      ],
    });

    expect(step.waitForEvent).toBeCalledTimes(1);
    expect(step.waitForEvent).toBeCalledWith('wait-for-thread-message-sync-complete-thread-id', {
      event: 'conversations/synchronize.thread.messages.complete',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'conversation-id' && async.data.threadId == 'thread-id'",
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('start-conversation-thread-messages-synchronization', [
      {
        data: {
          conversationId: 'conversation-id',
          isFirstSync: false,
          teamId: 'team-id',
          threadId: 'thread-id',
        },
        name: 'conversations/synchronize.thread.messages',
      },
    ]);
    expect(step.sendEvent).toBeCalledWith('conversation-sync-complete', {
      data: {
        conversationId: 'conversation-id',
        teamId: 'team-id',
      },
      name: 'conversations/synchronize.messages.complete',
    });
  });
});
