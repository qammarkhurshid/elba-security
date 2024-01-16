import { createInngestFunctionMock } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { insertOrganisations } from '@/common/__mocks__/token';
import { membersList } from '../users/__mocks__/dropbox';
import { pathJobEvents } from './__mocks__/path-jobs-events';
import { createPathSyncJobs } from './create-folder-and-files-sync-jobs';

const RETRY_AFTER = '300';
const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(
  createPathSyncJobs,
  'data-protection/create-folder-and-files-sync-jobs'
);

const mocks = vi.hoisted(() => {
  return {
    teamMembersListV2Mock: vi.fn(),
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
        teamMembersListV2: mocks.teamMembersListV2Mock,
      };
    }),
  };
});

describe('run-user-sync-jobs', () => {
  beforeEach(async () => {
    await insertOrganisations({
      size: 3,
      expiresAt: [
        new Date('2023-01-10T20:00:00.000Z'), // Expired token
        new Date('2023-01-14T20:00:00.000Z'),
        new Date('2023-01-14T20:00:00.000Z'),
      ],
    });
    mocks.teamMembersListV2Mock.mockReset();
  });

  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.teamMembersListV2Mock.mockRejectedValue(
      new DropboxResponseError(
        429,
        {},
        {
          error_summary: 'too_many_requests/...',
          error: {
            '.tag': 'too_many_requests',
            retry_after: RETRY_AFTER,
          },
        }
      )
    );

    const [result] = setup({
      organisationId,
      isFirstScan: true,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test('should fetch team members of the organisation & trigger events to synchronize folders and files', async () => {
    mocks.teamMembersListV2Mock.mockImplementation(() => {
      return {
        result: {
          members: membersList,
          has_more: false,
          cursor: 'cursor-1',
        },
      };
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-folders-and-files', pathJobEvents);
  });

  test('should fetch team members of the organisation & trigger events to synchronize folders and files', async () => {
    mocks.teamMembersListV2Mock.mockImplementation(() => {
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
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('synchronize-folders-and-files', pathJobEvents);

    expect(step.sendEvent).toBeCalledWith('create-folder-and-files-sync-jobs', {
      data: {
        cursor: 'cursor-1',
        isFirstScan: false,
        organisationId,
        syncStartedAt: '2021-01-01T00:00:00.000Z',
      },
      name: 'data-protection/create-folder-and-files-sync-jobs',
    });
  });
});
