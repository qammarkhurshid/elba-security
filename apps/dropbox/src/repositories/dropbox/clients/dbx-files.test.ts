import { expect, test, describe, vi, beforeEach } from 'vitest';
import {
  fetchFilesAndFoldersMockResponse,
  fetchFilesAndFoldersMockResponseWithPagination,
  folderAndFilesDbxResponseWithOutPagination,
  folderAndFilesDbxResponseWithPagination,
} from '../__mocks__/fetch-files-and-folder';
import {
  fetchSharedLinksMockResponse,
  sharedLinksDbxResponseWithoutPagination,
} from '../__mocks__/fetch-shared-links';
import {
  fetchUsersMockResponse,
  membersDbxResponseWithoutPagination,
} from '../__mocks__/fetch-users';
import { DBXFiles } from './dbx-files';

const accessToken = 'access-token-1';
const adminTeamMemberId = 'admin-team-member-id-1';
const teamMemberId = 'team-member-id-1';
const pathRoot = '1000';

const mocks = vi.hoisted(() => {
  return {
    fetchUsersMockResponse: vi.fn(),
    fetchUsersContinueMockResponse: vi.fn(),
    fetchSharedLinksMockResponse: vi.fn(),
    fetchFoldersAndFilesMockResponse: vi.fn(),
    fetchFoldersAndFilesContinueMockResponse: vi.fn(),
  };
});

vi.mock('@/repositories/dropbox/clients/DBXAccess', async () => {
  const dropbox = await vi.importActual('dropbox');

  if (!dropbox || typeof dropbox !== 'object') {
    throw new Error('Expected dropbox to be an object.');
  }

  return {
    ...dropbox,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        teamMembersListV2: mocks.fetchUsersMockResponse, // DBX methods have been inherited from the Dropbox class
        teamMembersListContinueV2: mocks.fetchUsersContinueMockResponse,
        sharingListSharedLinks: mocks.fetchSharedLinksMockResponse,
        filesListFolder: mocks.fetchFoldersAndFilesMockResponse,
        filesListFolderContinue: mocks.fetchFoldersAndFilesContinueMockResponse,
      };
    }),
  };
});

describe('dbx', () => {
  let dbx;
  beforeEach(() => {
    mocks.fetchUsersMockResponse.mockReset();
    mocks.fetchUsersContinueMockResponse.mockReset();
    mocks.fetchSharedLinksMockResponse.mockReset();
    mocks.fetchFoldersAndFilesMockResponse.mockReset();
    mocks.fetchFoldersAndFilesContinueMockResponse.mockReset();

    dbx = new DBXFiles({
      accessToken,
      adminTeamMemberId,
      teamMemberId,
      pathRoot,
    });
  });

  describe('fetchUsers', () => {
    test('should call the Dropbox teamMembersListV2 method and return the expected value', async () => {
      mocks.fetchUsersMockResponse.mockImplementation(() => {
        return membersDbxResponseWithoutPagination;
      });
      mocks.fetchUsersContinueMockResponse.mockImplementation(() => {
        return membersDbxResponseWithoutPagination;
      });

      await expect(dbx.fetchUsers()).resolves.toStrictEqual(fetchUsersMockResponse);
      await expect(dbx.fetchUsers('with-cursor')).resolves.toStrictEqual(fetchUsersMockResponse);
    });
  });

  describe('fetchSharedLinks', () => {
    test('should call the Dropbox sharingListSharedLinks method and return the expected value', async () => {
      mocks.fetchSharedLinksMockResponse.mockImplementation(() => {
        return sharedLinksDbxResponseWithoutPagination;
      });

      const dbx = new DBXFiles({
        accessToken,
        adminTeamMemberId,
        teamMemberId,
        pathRoot,
      });

      await expect(
        dbx.fetchSharedLinks({
          isPersonal: true,
        })
      ).resolves.toStrictEqual(fetchSharedLinksMockResponse);

      await expect(
        dbx.fetchSharedLinks({
          isPersonal: true,
          cursor: 'cursor-1', // With cursor
        })
      ).resolves.toStrictEqual(fetchSharedLinksMockResponse);
    });
  });

  describe('fetchFoldersAndFiles', () => {
    test('should call the Dropbox filesListFolder method and return the expected value', async () => {
      mocks.fetchFoldersAndFilesMockResponse.mockImplementation(() => {
        return folderAndFilesDbxResponseWithOutPagination;
      });

      mocks.fetchFoldersAndFilesContinueMockResponse.mockImplementation(() => {
        return folderAndFilesDbxResponseWithPagination;
      });

      const dbx = new DBXFiles({
        accessToken,
        adminTeamMemberId,
        teamMemberId,
        pathRoot,
      });

      await expect(dbx.fetchFoldersAndFiles()).resolves.toStrictEqual(
        fetchFilesAndFoldersMockResponse
      );
      await expect(dbx.fetchFoldersAndFiles('cursor-2')).resolves.toStrictEqual(
        fetchFilesAndFoldersMockResponseWithPagination
      );
    });
  });

  // TODO: Add tests for the following methods
  // fetchFilesMetadata
  // fetchFoldersMetadata
  // fetchFilesPermissions
  // fetchFoldersPermissions
  // fetchMetadataMembersAndMapDetails
});
