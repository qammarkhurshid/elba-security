import { createInngestFunctionMock } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { insertOrganisations, insertTestAccessToken } from '@/common/__mocks__/token';
import elba from '@/common/__mocks__/elba';
import { elbaUsers, membersList } from './__mocks__/dropbox';
import { runUserSyncJobs } from './run-user-sync-jobs';

const organisationId = '00000000-0000-0000-0000-000000000001';
const syncStartedAt = '2021-09-01T00:00:00.000Z';

const setup = createInngestFunctionMock(runUserSyncJobs, 'users/run-user-sync-jobs');

const mocks = vi.hoisted(() => {
  return {
    teamMembersListV2: vi.fn(),
    teamMembersListContinueV2: vi.fn(),
  };
});

// Mock Dropbox sdk
vi.mock('@/repositories/dropbox/clients/dbx-access', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        teamMembersListV2: mocks.teamMembersListV2,
        teamMembersListContinueV2: mocks.teamMembersListContinueV2,
      };
    }),
  };
});

describe('run-user-sync-jobs', () => {
  beforeEach(async () => {
    await insertOrganisations({});
    mocks.teamMembersListV2.mockReset();
    mocks.teamMembersListContinueV2.mockReset();
    elba.deleteUsers.mockReset();
    elba.updateUsers.mockReset();
  });

  beforeAll(() => {
    vi.clearAllMocks();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.teamMembersListV2.mockRejectedValue(
      new DropboxResponseError(
        429,
        {},
        {
          error_summary: 'too_many_requests/...',
          error: {
            '.tag': 'too_many_requests',
          },
        }
      )
    );

    await insertTestAccessToken();
    const [result] = setup({
      organisationId,
      isFirstScan: true,
      syncStartedAt,
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test('should call elba delete even if the user length is 0', async () => {
    mocks.teamMembersListV2.mockImplementation(() => {
      return {
        result: {
          members: [],
          has_more: false,
        },
      };
    });

    const [result] = setup({
      organisationId,
      isFirstScan: true,
      syncStartedAt,
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    await expect(elba.updateUsers).toBeCalledTimes(0);
    await expect(elba.deleteUsers).toBeCalledTimes(1);
    await expect(elba.deleteUsers).toBeCalledWith({
      syncedBefore: syncStartedAt,
    });
  });

  test('should fetch member data and forward it to Elba', async () => {
    mocks.teamMembersListV2.mockImplementation(() => {
      return {
        result: {
          members: membersList,
          has_more: false,
          cursor: 'cursor-1',
        },
      };
    });

    const [result] = setup({
      organisationId,
      isFirstScan: true,
      syncStartedAt,
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    await expect(elba.updateUsers).toBeCalledTimes(1);
    await expect(elba.updateUsers).toBeCalledWith(elbaUsers);
    await expect(elba.deleteUsers).toBeCalledTimes(1);
    await expect(elba.deleteUsers).toBeCalledWith({
      syncedBefore: syncStartedAt,
    });
  });

  test('should retrieve member data, paginate to the next page, and forward it to Elba', async () => {
    mocks.teamMembersListV2.mockImplementation(() => {
      return {
        result: {
          members: membersList,
          has_more: true,
          cursor: 'cursor-1',
        },
      };
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstScan: true,
      syncStartedAt,
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    await expect(elba.updateUsers).toBeCalledTimes(1);
    await expect(elba.updateUsers).toBeCalledWith(elbaUsers);
    await expect(elba.deleteUsers).toBeCalledTimes(0);
    await expect(step.sendEvent).toBeCalledTimes(1);
    await expect(step.sendEvent).toBeCalledWith('run-user-sync-job', {
      name: 'users/run-user-sync-jobs',
      data: {
        organisationId,
        isFirstScan: true,
        syncStartedAt,
        cursor: 'cursor-1',
      },
    });
  });
});
