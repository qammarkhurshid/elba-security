import { expect, test, describe, vi, afterEach } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { conversations, teams } from '@/database/schema';
import { handleSlackWebhookEvent } from '../../handle-slack-webhook-event';

const setup = createInngestFunctionMock(handleSlackWebhookEvent, 'slack/webhook.handle');

const eventType: SlackEvent['type'] = 'message';

describe(`handle-slack-webhook-event ${eventType} generic`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should be ignored if message input is not valid', async () => {
    const elba = spyOnElba();

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      // @ts-expect-error -- This is a partial mock
      event: {
        team: 'team-id',
        type: eventType,
        subtype: undefined,
        channel_type: 'channel',
        channel: 'channel-id',
        ts: 'message-id',
      },
    });

    await expect(result).resolves.toStrictEqual({
      channelId: 'channel-id',
      message: 'Ignored: invalid generic message input',
      messageId: 'message-id',
      teamId: 'team-id',
    });

    expect(elba).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should be ignored if conversation is not found', async () => {
    const elba = spyOnElba();

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      // @ts-expect-error -- This is a partial mock
      event: {
        team: 'team-id',
        type: eventType,
        subtype: undefined,
        channel_type: 'channel',
        channel: 'channel-id',
        ts: 'message-id',
        text: 'text',
        user: 'user-id',
      },
    });

    await expect(result).resolves.toStrictEqual({
      channelId: 'channel-id',
      message: 'Ignored: conversation not found',
      messageId: 'message-id',
      teamId: 'team-id',
    });

    expect(elba).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should be handled successfully', async () => {
    const elba = spyOnElba();

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    await db.insert(conversations).values({
      id: 'channel-id',
      isSharedExternally: false,
      lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
      name: 'channel',
      teamId: 'team-id',
    });

    const [result, { step }] = setup({
      // @ts-expect-error -- This is a partial mock
      event: {
        team: 'team-id',
        type: eventType,
        subtype: undefined,
        channel_type: 'channel',
        channel: 'channel-id',
        ts: '1700000001.000000',
        text: 'text',
        user: 'user-id',
      },
    });

    await expect(result).resolves.toStrictEqual({
      channelId: 'channel-id',
      message: 'Message handled',
      messageId: '1700000001.000000',
      teamId: 'team-id',
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
      sourceId: '00000000-0000-0000-0000-000000000000',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.updateObjects).toBeCalledWith({
      objects: [
        {
          id: '["team-id","channel-id","1700000001.000000"]',
          metadata: {
            conversationId: 'channel-id',
            messageId: '1700000001.000000',
            teamId: 'team-id',
            type: 'message',
          },
          name: '2023-11-14T22:13:21.000Z #channel',
          ownerId: 'user-id',
          permissions: [
            {
              id: 'domain',
              type: 'domain',
            },
          ],
          updatedAt: undefined,
          url: 'https://url/archives/channel-id/p1700000001000000',
        },
      ],
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
