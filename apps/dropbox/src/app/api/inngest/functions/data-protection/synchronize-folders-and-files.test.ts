import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { insertOrganisations, insertTestSharedLinks } from '@/common/__mocks__/token';
import { DropboxResponseError } from 'dropbox';
import elba from '@/common/__mocks__/elba';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { synchronizeFoldersAndFiles } from './synchronize-folders-and-files';

import {
  folderAndFilesWithOutPagination,
  sharedLinks,
} from './__mocks__/folder-files-and-shared-links';
import { foldersAndFilesToAdd } from './__mocks__/folders-and-files-to-add';

const RETRY_AFTER = '300';
const organisationId = '00000000-0000-0000-0000-000000000001';
const teamMemberId = 'team-member-id-1';
const syncStartedAt = '2021-01-01T00:00:00.000Z';

const setup = createInngestFunctionMock(
  synchronizeFoldersAndFiles,
  'data-protection/synchronize-folders-and-files'
);

const mocks = vi.hoisted(() => {
  return {
    fetchFoldersAndFilesMock: vi.fn(),
    fetchMetadataMembersAndMapDetailsMock: vi.fn(),
  };
});

vi.mock('@/repositories/dropbox/clients/dbx-files', () => {
  const dropbox = vi.importActual('dropbox');
  return {
    ...dropbox,
    DBXFiles: vi.fn(() => {
      return {
        fetchFoldersAndFiles: mocks.fetchFoldersAndFilesMock,
        fetchMetadataMembersAndMapDetails: mocks.fetchMetadataMembersAndMapDetailsMock,
      };
    }),
  };
});

describe('synchronizeFoldersAndFiles', async () => {
  beforeEach(async () => {
    await insertOrganisations({
      size: 3,
      expiresAt: [
        new Date('2023-01-10T20:00:00.000Z'), // Expired token
        new Date('2023-01-14T20:00:00.000Z'),
        new Date('2023-01-14T20:00:00.000Z'),
      ],
    });
    mocks.fetchFoldersAndFilesMock.mockReset();
    mocks.fetchMetadataMembersAndMapDetailsMock.mockReset();
    elba.updateDataProtectionObjects.mockReset();
  });

  beforeAll(async () => {
    vi.clearAllMocks();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.fetchFoldersAndFilesMock.mockRejectedValue(
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

    const [result, { step }] = setup({
      organisationId,
      isFirstScan: true,
      syncStartedAt,
      cursor: 'cursor-1',
      teamMemberId,
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
    expect(step.sendEvent).toBeCalledTimes(0);
    await expect(elba.updateDataProtectionObjects).toBeCalledTimes(0);
  });

  test('should list all the folders and files in the first page for the respective team member', async () => {
    await insertTestSharedLinks(sharedLinks);

    mocks.fetchFoldersAndFilesMock.mockImplementation(() => {
      return folderAndFilesWithOutPagination;
    });

    mocks.fetchMetadataMembersAndMapDetailsMock.mockImplementation(() => {
      return foldersAndFilesToAdd;
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstScan: false,
      syncStartedAt,
      teamMemberId,
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    await expect(step.run).toBeCalledTimes(3);
    await expect(elba.updateDataProtectionObjects).toBeCalledTimes(1);
  });

  test('should list all the folders and files in the first page for the respective team member & trigger the next page scan', async () => {
    await insertTestSharedLinks(sharedLinks);

    mocks.fetchFoldersAndFilesMock.mockImplementation(() => {
      return {
        ...folderAndFilesWithOutPagination,
        hasMore: true,
      };
    });

    mocks.fetchMetadataMembersAndMapDetailsMock.mockImplementation(() => {
      return foldersAndFilesToAdd;
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstScan: false,
      syncStartedAt,
      teamMemberId,
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-folders-and-files', {
      name: 'data-protection/synchronize-folders-and-files',
      data: {
        organisationId,
        isFirstScan: false,
        syncStartedAt,
        teamMemberId,
        cursor: 'cursor-1',
      },
    });

    await expect(step.run).toBeCalledTimes(3);
    await expect(elba.updateDataProtectionObjects).toBeCalledTimes(1);
    await expect(elba.updateDataProtectionObjects).toBeCalledWith({
      objects: foldersAndFilesToAdd,
    });
  });
});
