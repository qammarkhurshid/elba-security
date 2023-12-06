import { expect, test, describe, vi, afterEach } from 'vitest';
import * as slack from 'slack-web-api-client';
import * as elba from '@elba-security/sdk';
import { createFunctionMock } from '@/inngest/__mocks__/inngest';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { synchronizeUsers } from './synchronize-users';

const setup = createFunctionMock(synchronizeUsers, 'users/synchronize');

vi.mock('slack-web-api-client');

describe('synchronize-users', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should synchronize users successfully and handle pagination', async () => {
    const usersListMock = vi.fn().mockResolvedValue({
      ok: true,
      members: [
        {
          id: '1',
          real_name: 'test',
          profile: {
            email: 'test@test.test',
          },
          team_id: 'team-id',
        },
      ],
      headers: new Headers(),
      response_metadata: {
        next_cursor: 'next-cursor',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.users.list>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      users: {
        list: usersListMock,
      },
    });

    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      vi.spyOn(client.users, 'delete');
      vi.spyOn(client.users, 'update');
      return client;
    });

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      isFirstSync: true,
      syncStartedAt: '2023-01-01T00:00:00.000Z',
      teamId: 'team-id',
    });

    await expect(result).resolves.toStrictEqual({
      users: [
        {
          additionalEmails: [],
          displayName: 'test',
          email: 'test@test.test',
          id: '1',
        },
      ],
      nextCursor: 'next-cursor',
    });

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('token');

    expect(usersListMock).toBeCalledTimes(1);
    expect(usersListMock).toBeCalledWith({ limit: 1 });

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
          displayName: 'test',
          email: 'test@test.test',
          id: '1',
        },
      ],
    });
    expect(elbaClientMock.users.delete).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('next-pagination-cursor', {
      data: {
        cursor: 'next-cursor',
        isFirstSync: true,
        syncStartedAt: '2023-01-01T00:00:00.000Z',
        teamId: 'team-id',
      },
      name: 'users/synchronize',
    });
  });

  test('should synchronize users successfully and end when pagination is over', async () => {
    const usersListMock = vi.fn().mockResolvedValue({
      ok: true,
      members: [
        {
          id: '1',
          real_name: 'test',
          profile: {
            email: 'test@test.test',
          },
          team_id: 'team-id',
        },
      ],
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.users.list>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      users: {
        list: usersListMock,
      },
    });

    const ElbaClient = elba.Elba;
    const elbaMock = vi.spyOn(elba, 'Elba').mockImplementation((...args) => {
      const client = new ElbaClient(...args);
      vi.spyOn(client.users, 'delete');
      vi.spyOn(client.users, 'update');
      return client;
    });

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      isFirstSync: false,
      syncStartedAt: '2023-01-01T00:00:00.000Z',
      teamId: 'team-id',
      cursor: 'cursor',
    });

    await expect(result).resolves.toStrictEqual({
      users: [
        {
          additionalEmails: [],
          displayName: 'test',
          email: 'test@test.test',
          id: '1',
        },
      ],
      nextCursor: undefined,
    });

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('token');

    expect(usersListMock).toBeCalledTimes(1);
    expect(usersListMock).toBeCalledWith({ cursor: 'cursor', limit: 1 });

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
          displayName: 'test',
          email: 'test@test.test',
          id: '1',
        },
      ],
    });
    expect(elbaClientMock.users.delete).toBeCalledTimes(1);
    expect(elbaClientMock.users.delete).toBeCalledWith({
      syncedBefore: '2023-01-01T00:00:00.000Z',
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
