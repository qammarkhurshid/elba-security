import { expect, test, describe, vi, afterEach } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import * as elba from '@elba-security/sdk';
import { createFunctionMock } from '@/inngest/__mocks__/inngest';
import { db } from '@/database/client';
import { conversations, teams } from '@/database/schema';
import { handleSlackWebhookEvent } from '../../handle-slack-webhook-event';

const setup = createFunctionMock(handleSlackWebhookEvent, 'slack/webhook.handle');

const eventType: SlackEvent['type'] = 'message';

describe(`handle-slack-webhook-event ${eventType} generic`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should be ignored if message input is not valid', async () => {
    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      return client;
    });

    await db.insert(teams).values({
      id: 'team-id',
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
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

    expect(elbaMock).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should be ignored if conversation is not found', async () => {
    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      return client;
    });

    await db.insert(teams).values({
      id: 'team-id',
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
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

    expect(elbaMock).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should be handled successfully', async () => {
    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      vi.spyOn(client.dataProtection, 'updateObjects');
      return client;
    });

    await db.insert(teams).values({
      id: 'team-id',
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
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
          id: '["team-id","channel-id","1700000001.000000"]',
          metadata: {
            channelId: 'channel-id',
            messageId: '1700000001.000000',
            teamId: 'team-id',
            type: 'message',
          },
          name: 'Sent on 2023-11-14T22:13:21.000Z #channel',
          ownerId: 'user-id',
          permissions: [
            {
              id: 'anyone',
              type: 'anyone',
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
