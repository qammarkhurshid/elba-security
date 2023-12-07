import { expect, test, describe, vi, afterEach } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import * as elba from '@elba-security/sdk';
import { createFunctionMock } from '@/inngest/__mocks__/inngest';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { handleSlackWebhookEvent } from '../../handle-slack-webhook-event';
import type { SlackMessageSubtype } from './types';

const setup = createFunctionMock(handleSlackWebhookEvent, 'slack/webhook.handle');

const eventType: SlackEvent['type'] = 'message';
const messageSubtype: SlackMessageSubtype = 'message_deleted';

describe(`handle-slack-webhook-event ${eventType} ${messageSubtype}`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete message successfully', async () => {
    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      vi.spyOn(client.dataProtection, 'deleteObjects');
      return client;
    });

    await db.insert(teams).values({
      id: 'team-id',
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      team_id: 'team-id',
      // @ts-expect-error -- This is a partial mock
      event: {
        type: eventType,
        subtype: messageSubtype,
        channel_type: 'channel',
        deleted_ts: 'message-id',
        channel: 'channel-id',
      },
    });

    await expect(result).resolves.toStrictEqual({
      channelId: 'channel-id',
      message: 'Message deleted',
      messageId: 'message-id',
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
    expect(elbaClientMock.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaClientMock.dataProtection.deleteObjects).toBeCalledWith({
      ids: ['["team-id","channel-id","message-id"]'],
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
