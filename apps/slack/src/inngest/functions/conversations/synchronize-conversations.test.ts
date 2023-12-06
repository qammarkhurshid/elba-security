import { expect, test, describe, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { createFunctionMock } from '@/inngest/__mocks__/inngest';
import { db } from '@/database/client';
import { conversations, teams } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { synchronizeConversations } from './synchronize-conversations';
import * as slack from 'slack-web-api-client';
import * as elba from '@elba-security/sdk';

vi.mock('slack-web-api-client');

const setup = createFunctionMock(synchronizeConversations, 'conversations/synchronize');

const mockedDate = '2023-01-01T00:00:00.000Z';

describe('synchronize-conversations', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should properly synchronize conversations and handle pagination', async () => {
    const listMock = vi.fn().mockResolvedValue({
      ok: true,
      channels: [
        {
          id: 'channel-id-1',
          name: 'channel1',
          is_ext_shared: true,
        },
        {
          id: 'channel-id-2',
          name: 'channel2',
          is_ext_shared: false,
        },
      ],
      headers: new Headers(),
      response_metadata: {
        next_cursor: 'next-cursor',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.list>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      conversations: {
        list: listMock,
      },
    });

    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      return client;
    });

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });
    await db.insert(conversations).values({
      id: 'channel-id-1', // This conversation should be updated
      isSharedExternally: false,
      lastSyncedAt: new Date('2000-01-01T00:00:00.000Z'),
      name: 'old name',
      teamId: 'team-id',
    });

    const [result, { step }] = setup({
      teamId: 'team-id',
      isFirstSync: true,
      syncStartedAt: '2023-01-01T00:00:00.000Z',
    });

    await expect(result).resolves.toStrictEqual({
      conversationsToInsert: [
        {
          id: 'channel-id-1',
          isSharedExternally: true,
          lastSyncedAt: new Date(mockedDate),
          name: 'channel1',
          teamId: 'team-id',
        },
        {
          id: 'channel-id-2',
          isSharedExternally: false,
          lastSyncedAt: new Date(mockedDate),
          name: 'channel2',
          teamId: 'team-id',
        },
      ],
      nextCursor: 'next-cursor',
    });

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('token');

    expect(listMock).toBeCalledTimes(1);
    expect(listMock).toBeCalledWith({
      exclude_archived: true,
      limit: 2,
      types: 'public_channel',
    });

    const conversationsInserted = await db.query.conversations.findMany();
    expect(conversationsInserted).toEqual([
      {
        id: 'channel-id-1',
        isSharedExternally: true,
        lastSyncedAt: new Date(mockedDate),
        name: 'channel1',
        teamId: 'team-id',
      },
      {
        id: 'channel-id-2',
        isSharedExternally: false,
        lastSyncedAt: new Date(mockedDate),
        name: 'channel2',
        teamId: 'team-id',
      },
    ]);

    expect(elbaMock).toBeCalledTimes(0);

    expect(step.waitForEvent).toBeCalledTimes(2);
    expect(step.waitForEvent).toBeCalledWith('wait-for-message-complete-channel-id-1', {
      event: 'conversations/synchronize.messages.complete',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'channel-id-1'",
      timeout: '1 day',
    });
    expect(step.waitForEvent).toBeCalledWith('wait-for-message-complete-channel-id-2', {
      event: 'conversations/synchronize.messages.complete',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'channel-id-2'",
      timeout: '1 day',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('start-conversations-messages-synchronization', [
      {
        data: {
          conversationId: 'channel-id-1',
          isFirstSync: true,
          teamId: 'team-id',
        },
        name: 'conversations/synchronize.messages',
      },
      {
        data: {
          conversationId: 'channel-id-2',
          isFirstSync: true,
          teamId: 'team-id',
        },
        name: 'conversations/synchronize.messages',
      },
    ]);
    expect(step.sendEvent).toBeCalledWith('next-pagination-cursor', {
      data: {
        cursor: 'next-cursor',
        isFirstSync: true,
        syncStartedAt: '2023-01-01T00:00:00.000Z',
        teamId: 'team-id',
      },
      name: 'conversations/synchronize',
    });
  });

  test('should properly synchronize conversations and end when pagination is over', async () => {
    const listMock = vi.fn().mockResolvedValue({
      ok: true,
      channels: [
        {
          id: 'channel-id-1',
          name: 'channel1',
          is_ext_shared: true,
        },
        {
          id: 'channel-id-2',
          name: 'channel2',
          is_ext_shared: false,
        },
      ],
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.conversations.list>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      conversations: {
        list: listMock,
      },
    });

    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      vi.spyOn(client.dataProtection, 'deleteObjects');
      return client;
    });

    await db.insert(teams).values([
      {
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        id: 'team-id',
        token: 'token',
        url: 'https://url',
      },
      {
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        id: 'unknown-team-id',
        token: 'token',
        url: 'https://url',
      },
    ]);

    await db.insert(conversations).values([
      {
        // This conversation should be delete
        id: 'conversation-id',
        isSharedExternally: true,
        lastSyncedAt: new Date('1970-01-01T00:00:00.000Z'),
        name: 'conversation',
        teamId: 'team-id',
      },
      {
        // This conversation shouldn't be deleted as it's part of another team
        id: 'unknown-conversation-id',
        isSharedExternally: true,
        lastSyncedAt: new Date('1970-01-01T00:00:00.000Z'),
        name: 'conversation',
        teamId: 'unknown-team-id',
      },
    ]);

    const [result, { step }] = setup({
      teamId: 'team-id',
      isFirstSync: false,
      syncStartedAt: '2023-01-01T00:00:00.000Z',
      cursor: 'cursor',
    });

    await expect(result).resolves.toStrictEqual({
      conversationsToInsert: [
        {
          id: 'channel-id-1',
          isSharedExternally: true,
          lastSyncedAt: new Date(mockedDate),
          name: 'channel1',
          teamId: 'team-id',
        },
        {
          id: 'channel-id-2',
          isSharedExternally: false,
          lastSyncedAt: new Date(mockedDate),
          name: 'channel2',
          teamId: 'team-id',
        },
      ],
      nextCursor: undefined,
    });

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('token');

    expect(listMock).toBeCalledTimes(1);
    expect(listMock).toBeCalledWith({
      cursor: 'cursor',
      exclude_archived: true,
      limit: 2,
      types: 'public_channel',
    });

    const conversationsInserted = await db.query.conversations.findMany();
    expect(conversationsInserted).toEqual([
      {
        id: 'unknown-conversation-id',
        isSharedExternally: true,
        lastSyncedAt: new Date('1970-01-01T00:00:00.000Z'),
        name: 'conversation',
        teamId: 'unknown-team-id',
      },
      {
        id: 'channel-id-1',
        isSharedExternally: true,
        lastSyncedAt: new Date(mockedDate),
        name: 'channel1',
        teamId: 'team-id',
      },
      {
        id: 'channel-id-2',
        isSharedExternally: false,
        lastSyncedAt: new Date(mockedDate),
        name: 'channel2',
        teamId: 'team-id',
      },
    ]);

    expect(elbaMock).toBeCalledTimes(1);
    expect(elbaMock).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      sourceId: '00000000-0000-0000-0000-000000000000',
    });

    const elbaClientMock = elbaMock.mock.results[0]?.value as elba.Elba;
    expect(elbaClientMock).toBeInstanceOf(ElbaClient);
    expect(elbaClientMock.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaClientMock.dataProtection.deleteObjects).toBeCalledWith({
      syncedBefore: '2023-01-01T00:00:00.000Z',
    });

    expect(step.waitForEvent).toBeCalledTimes(2);
    expect(step.waitForEvent).toBeCalledWith('wait-for-message-complete-channel-id-1', {
      event: 'conversations/synchronize.messages.complete',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'channel-id-1'",
      timeout: '1 day',
    });
    expect(step.waitForEvent).toBeCalledWith('wait-for-message-complete-channel-id-2', {
      event: 'conversations/synchronize.messages.complete',
      if: "async.data.teamId == 'team-id' && async.data.conversationId == 'channel-id-2'",
      timeout: '1 day',
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('start-conversations-messages-synchronization', [
      {
        data: {
          conversationId: 'channel-id-1',
          isFirstSync: false,
          teamId: 'team-id',
        },
        name: 'conversations/synchronize.messages',
      },
      {
        data: {
          conversationId: 'channel-id-2',
          isFirstSync: false,
          teamId: 'team-id',
        },
        name: 'conversations/synchronize.messages',
      },
    ]);
  });
});
