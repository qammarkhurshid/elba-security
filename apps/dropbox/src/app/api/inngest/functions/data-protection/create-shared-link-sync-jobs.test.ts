import { createInngestFunctionMock } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { insertOrganisations } from '@/common/__mocks__/token';
import { membersList } from '../users/__mocks__/dropbox';
import { sharedLinksEvents } from './__mocks__/shared-links-events';
import { createSharedLinkSyncJobs } from './create-shared-link-sync-jobs';
import { truncate } from 'fs/promises';
const RETRY_AFTER = '300';
const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(
  createSharedLinkSyncJobs,
  'data-protection/create-shared-link-sync-jobs'
);

const mocks = vi.hoisted(() => {
  return {
    teamMembersListV2Mock: vi.fn(),
  };
});

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

  test('should fetch team members of the organisation & trigger events to fetch shared links', async () => {
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
      isFirstScan: true,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.waitForEvent).toBeCalledTimes(6);

    sharedLinksEvents.forEach((link) => {
      expect(step.waitForEvent).toBeCalledWith(`wait-for-shared-links-to-be-fetched`, {
        event: 'data-protection/synchronize-shared-links.completed',
        timeout: '1 day',
        if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${link.teamMemberId}' && async.data.isPersonal == ${link.isPersonal}`,
      });
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'synchronize-shared-links',
      expect.arrayContaining(
        sharedLinksEvents.map((sharedLinkJob) => ({
          name: 'data-protection/synchronize-shared-links',
          data: sharedLinkJob,
        }))
      )
    );

    expect(step.sendEvent).toBeCalledWith('create-folder-and-files-sync-jobs', {
      data: {
        adminTeamMemberId: undefined,
        isFirstScan: true,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
      },
      name: 'data-protection/create-folder-and-files-sync-jobs',
    });
  });

  test('should retrieve member data, paginate to the next page, and trigger events to fetch shared links', async () => {
    mocks.teamMembersListV2Mock.mockImplementation(() => {
      return {
        result: {
          members: membersList,
          has_more: truncate,
          cursor: 'cursor-1',
        },
      };
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstScan: true,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.waitForEvent).toBeCalledTimes(6);

    sharedLinksEvents.forEach((link) => {
      expect(step.waitForEvent).toBeCalledWith(`wait-for-shared-links-to-be-fetched`, {
        event: 'data-protection/synchronize-shared-links.completed',
        timeout: '1 day',
        if: `async.data.organisationId == '${organisationId}' && async.data.teamMemberId == '${link.teamMemberId}' && async.data.isPersonal == ${link.isPersonal}`,
      });
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith(
      'synchronize-shared-links',
      expect.arrayContaining(
        sharedLinksEvents.map((sharedLinkJob) => ({
          name: 'data-protection/synchronize-shared-links',
          data: sharedLinkJob,
        }))
      )
    );

    expect(step.sendEvent).toBeCalledWith('create-shared-link-sync-jobs', {
      data: {
        isFirstScan: true,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
        cursor: 'cursor-1',
      },
      name: 'data-protection/create-shared-link-sync-jobs',
    });
  });
});
