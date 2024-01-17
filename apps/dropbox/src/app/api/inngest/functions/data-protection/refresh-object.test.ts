import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { insertOrganisations, insertTestSharedLinks } from '@/common/__mocks__/token';
import { refreshObject } from './refresh-object';
import { foldersAndFiles, sharedLinks } from './__mocks__/folder-files-and-shared-links';
import { foldersAndFilesToAdd } from './__mocks__/folders-and-files-to-add';

const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(refreshObject, 'data-protection/refresh-object');

const mocks = vi.hoisted(() => {
  return {
    fetchSharedLinksByPathMock: vi.fn(),
    fetchFolderOrFileMetadataByPathMock: vi.fn(),
    fetchMetadataMembersAndMapDetailsMock: vi.fn(),
  };
});

vi.mock('@/repositories/dropbox/clients/dbx-files', () => {
  const dropbox = vi.importActual('dropbox');
  return {
    ...dropbox,
    DBXFiles: vi.fn(() => {
      return {
        fetchSharedLinksByPath: mocks.fetchSharedLinksByPathMock,
        fetchFolderOrFileMetadataByPath: mocks.fetchFolderOrFileMetadataByPathMock,
        fetchMetadataMembersAndMapDetails: mocks.fetchMetadataMembersAndMapDetailsMock,
      };
    }),
  };
});

describe('refreshObject', async () => {
  beforeEach(async () => {
    await insertOrganisations({
      size: 3,
    });
    await insertTestSharedLinks(sharedLinks);
    mocks.fetchSharedLinksByPathMock.mockReset();
    mocks.fetchFolderOrFileMetadataByPathMock.mockReset();
    mocks.fetchMetadataMembersAndMapDetailsMock.mockReset();
  });

  beforeAll(async () => {
    vi.clearAllMocks();
  });

  test('should list all the folders and files in the first page for the respective team member', async () => {
    const spyElba = spyOnElba();
    mocks.fetchSharedLinksByPathMock.mockResolvedValueOnce([sharedLinks.at(0), sharedLinks.at(1)]);
    mocks.fetchFolderOrFileMetadataByPathMock.mockResolvedValueOnce({
      '.tag': 'folder',
      id: 'id:folder-id-1',
      name: 'folder-1',
      path_display: '/folder-1',
      shared_folder_id: 'share-folder-id-1',
    });

    const [result, { step }] = await setup({
      id: 'source-object-id',
      organisationId,
      metadata: {
        ownerId: 'team-member-id-1',
        isPersonal: false,
        type: 'folder',
      },
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    const elba = spyElba.mock.results.at(0)?.value;

    expect(step.run).toBeCalledTimes(1);
    expect(await elba?.dataProtection.updateObjects).not.toBeCalled();
    expect(await elba?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(await elba?.dataProtection.deleteObjects).toBeCalledWith({
      ids: ['source-object-id'],
    });
  });

  test('should successfully refresh the requested file or folder', async () => {
    const spyElba = spyOnElba();
    mocks.fetchSharedLinksByPathMock.mockResolvedValueOnce([sharedLinks.at(0), sharedLinks.at(1)]);
    mocks.fetchFolderOrFileMetadataByPathMock.mockResolvedValueOnce(foldersAndFiles.at(0));
    mocks.fetchMetadataMembersAndMapDetailsMock.mockResolvedValueOnce([foldersAndFilesToAdd.at(0)]);

    const [result, { step }] = setup({
      id: 'source-object-id',
      organisationId,
      metadata: {
        ownerId: 'team-member-id-1',
        isPersonal: false,
        type: 'folder',
      },
    });

    expect(await result).toStrictEqual({
      success: true,
    });
    const elba = spyElba.mock.results.at(0)?.value;

    expect(step.run).toBeCalledTimes(1);
    expect(elba?.dataProtection.deleteObjects).not.toBeCalled();
    // expect(elba?.dataProtection.updateObjects).toBeCalledTimes(1);
    // expect(elba?.dataProtection.updateObjects).toBeCalledWith({
    //   objects: [
    //     {
    //       id: '000001',
    //       metadata: {
    //         is_personal: true,
    //         shared_links: [],
    //         type: 'folder',
    //       },
    //       name: 'folder-1',
    //       ownerId: 'dbmid:team-member-id-1',
    //       permissions: [
    //         {
    //           email: 'team-member-email-1@foo.com',
    //           id: 'team-member-email-1@foo.com',
    //           type: 'user',
    //         },
    //       ],
    //       url: 'https://www.dropbox.com/folder-1',
    //     },
    //   ],
    // });
  });
});
