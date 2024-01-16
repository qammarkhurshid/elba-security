import { createInngestFunctionMock } from '@elba-security/test-utils';
import { DropboxResponseError } from 'dropbox';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  teamMemberOnceSecondPageWithoutPagination,
  teamMemberOneFirstPage,
} from './__mocks__/shared-links';
import { synchronizeSharedLinks } from './synchronize-shared-links';
import { insertOrganisations } from '@/common/__mocks__/token';
const RETRY_AFTER = '300';
const organisationId = '00000000-0000-0000-0000-000000000001';
const teamMemberId = 'team-member-id-1';

const setup = createInngestFunctionMock(
  synchronizeSharedLinks,
  'data-protection/synchronize-shared-links'
);

const mocks = vi.hoisted(() => {
  return {
    sharingListSharedLinksMock: vi.fn(),
  };
});

// Mock Dropbox sdk
vi.mock('@/repositories/dropbox/clients/dbx-access', async () => {
  const dropbox = await vi.importActual('dropbox');

  if (!dropbox || typeof dropbox !== 'object') {
    throw new Error('Expected dropbox to be an object.');
  }

  return {
    ...dropbox,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        sharingListSharedLinks: mocks.sharingListSharedLinksMock,
      };
    }),
  };
});

describe('fetch-shared-links', () => {
  beforeEach(async () => {
    await insertOrganisations({
      size: 3,
      expiresAt: [
        new Date('2023-01-10T20:00:00.000Z'), // Expired token
        new Date('2023-01-14T20:00:00.000Z'),
        new Date('2023-01-14T20:00:00.000Z'),
      ],
    });
    mocks.sharingListSharedLinksMock.mockReset();
  });

  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.sharingListSharedLinksMock.mockRejectedValue(
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
      teamMemberId,
      isPersonal: false,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test('should fetch shared links of a member and insert into db & should call the event itself to fetch next page', async () => {
    mocks.sharingListSharedLinksMock.mockImplementation(() => {
      return teamMemberOneFirstPage;
    });

    const [result, { step }] = setup({
      organisationId,
      teamMemberId,
      isPersonal: false,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-shared-links', {
      data: {
        isFirstScan: false,
        isPersonal: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
        teamMemberId: 'team-member-id-1',
        cursor: 'has-more-cursor',
      },
      name: 'data-protection/synchronize-shared-links',
    });
  });

  test('should fetch shared links of a member and insert into db & should call the waitFore event', async () => {
    mocks.sharingListSharedLinksMock.mockImplementation(() => {
      return teamMemberOnceSecondPageWithoutPagination;
    });

    const [result, { step }] = setup({
      organisationId,
      teamMemberId,
      isPersonal: false,
      cursor: 'has-more-cursor',
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('wait-for-shared-links-to-be-fetched', {
      data: {
        cursor: 'has-more-cursor',
        isFirstScan: false,
        isPersonal: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
        teamMemberId: 'team-member-id-1',
      },
      name: 'data-protection/synchronize-shared-links.completed',
    });
  });
});
