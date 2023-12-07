import { expect, test, describe } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createFunctionMock } from '@/inngest/__mocks__/inngest';
import { db } from '@/database/client';
import { conversations, teams } from '@/database/schema';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createFunctionMock(handleSlackWebhookEvent, 'slack/webhook.handle');

const eventType: SlackEvent['type'] = 'channel_archive';

describe(`handle-slack-webhook-event ${eventType}`, () => {
  test('should delete channel successfully', async () => {
    await db.insert(teams).values([
      {
        id: 'team-id',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        token: 'token',
        url: 'https://url',
      },
      {
        id: 'another-team-id',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        token: 'token',
        url: 'https://url',
      },
    ]);
    await db.insert(conversations).values([
      {
        id: 'channel-id-1',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel 1',
        teamId: 'team-id',
      },
      {
        // Should not be deleted as it doesn't match the same id
        id: 'channel-id-2',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel 2',
        teamId: 'team-id',
      },
      {
        // Should not be deleted as it doesn't match the same team id
        id: 'channel-id-1',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'another-team-id',
      },
    ]);

    const [result, { step }] = setup({
      team_id: 'team-id',
      // @ts-expect-error -- this is a partial mock
      event: {
        type: eventType,
        channel: 'channel-id-1',
      },
    });

    await expect(result).resolves.toStrictEqual({
      channelId: 'channel-id-1',
      message: 'Channel archived',
      teamId: 'team-id',
    });

    const conversationsInserted = await db.query.conversations.findMany();

    expect(conversationsInserted).toEqual([
      {
        id: 'channel-id-2',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel 2',
        teamId: 'team-id',
      },
      {
        id: 'channel-id-1',
        isSharedExternally: false,
        lastSyncedAt: new Date('2023-01-01T00:00:00.000Z'),
        name: 'channel',
        teamId: 'another-team-id',
      },
    ]);

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
