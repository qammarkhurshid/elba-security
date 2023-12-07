import { expect, test, describe, vi, afterEach } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import * as elba from '@elba-security/sdk';
import { createFunctionMock } from '@/inngest/__mocks__/inngest';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

vi.mock('slack-web-api-client');

const setup = createFunctionMock(handleSlackWebhookEvent, 'slack/webhook.handle');

const eventType: SlackEvent['type'] = 'user_change';

describe(`handle-slack-webhook-event ${eventType}`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should update user successfully', async () => {
    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      vi.spyOn(client.users, 'delete');
      vi.spyOn(client.users, 'update');
      return client;
    });

    await db.insert(teams).values([
      {
        id: 'team-id',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        token: 'token',
        url: 'https://url',
      },
    ]);

    const [result, { step }] = setup({
      team_id: 'team-id',
      event: {
        type: eventType,
        user: {
          team_id: 'team-id',
          id: 'user-id',
          is_bot: false,
          deleted: false,
          real_name: 'John Doe',
          // @ts-expect-error -- this is a partial mock
          profile: {
            email: 'user@domain.com',
          },
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'User updated',
      teamId: 'team-id',
      user: {
        deleted: false,
        id: 'user-id',
        is_bot: false,
        profile: {
          email: 'user@domain.com',
        },
        real_name: 'John Doe',
        team_id: 'team-id',
      },
    });

    expect(elbaMock).toBeCalledTimes(1);
    expect(elbaMock).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      sourceId: '00000000-0000-0000-0000-000000000000',
    });

    const elbaClientMock = elbaMock.mock.results[0]?.value as elba.Elba;
    expect(elbaClientMock).toBeInstanceOf(ElbaClient);
    expect(elbaClientMock.users.update).toBeCalledTimes(1);
    expect(elbaClientMock.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'John Doe',
          email: 'user@domain.com',
          id: 'user-id',
        },
      ],
    });
    expect(elbaClientMock.users.delete).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delete user successfully', async () => {
    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      vi.spyOn(client.users, 'delete');
      vi.spyOn(client.users, 'update');
      return client;
    });

    await db.insert(teams).values([
      {
        id: 'team-id',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        token: 'token',
        url: 'https://url',
      },
    ]);

    const [result, { step }] = setup({
      team_id: 'team-id',
      event: {
        type: eventType,
        user: {
          team_id: 'team-id',
          id: 'user-id',
          is_bot: false,
          deleted: true,
          real_name: 'John Doe',
          // @ts-expect-error -- this is a partial mock
          profile: {
            email: 'user@domain.com',
          },
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'User deleted',
      teamId: 'team-id',
      user: {
        deleted: true,
        id: 'user-id',
        is_bot: false,
        profile: {
          email: 'user@domain.com',
        },
        real_name: 'John Doe',
        team_id: 'team-id',
      },
    });

    expect(elbaMock).toBeCalledTimes(1);
    expect(elbaMock).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      sourceId: '00000000-0000-0000-0000-000000000000',
    });

    const elbaClientMock = elbaMock.mock.results[0]?.value as elba.Elba;
    expect(elbaClientMock).toBeInstanceOf(ElbaClient);
    expect(elbaClientMock.users.update).toBeCalledTimes(0);
    expect(elbaClientMock.users.delete).toBeCalledTimes(1);
    expect(elbaClientMock.users.delete).toBeCalledWith({ ids: ['user-id'] });

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should ignored if user is a bot', async () => {
    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      return client;
    });

    await db.insert(teams).values([
      {
        id: 'team-id',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        token: 'token',
        url: 'https://url',
      },
    ]);

    const [result, { step }] = setup({
      team_id: 'team-id',
      event: {
        type: eventType,
        user: {
          team_id: 'team-id',
          id: 'user-id',
          is_bot: true,
          deleted: true,
          real_name: 'John Doe',
          // @ts-expect-error -- this is a partial mock
          profile: {
            email: 'user@domain.com',
          },
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'Ignored: invalid user',
      user: {
        deleted: true,
        id: 'user-id',
        is_bot: true,
        profile: {
          email: 'user@domain.com',
        },
        real_name: 'John Doe',
        team_id: 'team-id',
      },
    });

    expect(elbaMock).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
