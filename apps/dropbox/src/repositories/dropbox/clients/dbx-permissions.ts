import { DeleteObjectPermissions } from '../types/types';
import { DBXAccess } from './dbx-access';
export class DBXPermissions {
  private adminTeamMemberId?: string;
  private dbx: DBXAccess;

  constructor({
    accessToken,
    adminTeamMemberId,
  }: {
    accessToken: string;
    adminTeamMemberId: string;
  }) {
    this.adminTeamMemberId = adminTeamMemberId;

    this.dbx = new DBXAccess({
      accessToken,
    });

    this.dbx.setHeaders({
      selectAdmin: this.adminTeamMemberId,
    });
  }

  removePermissions = async ({
    id: idSource,
    metadata: { type },
    permissions,
  }: DeleteObjectPermissions) => {
    return Promise.all(
      permissions.map(async ({ id: permissionId, metadata }) => {
        if (metadata?.sharedLinks?.length > 0) {
          metadata?.sharedLinks?.map(async (sharedLink: string) => {
            return this.dbx.sharingRevokeSharedLink({
              url: sharedLink,
            });
          });
        }

        if (type == 'folder') {
          this.dbx.sharingRemoveFolderMember({
            leave_a_copy: false,
            shared_folder_id: idSource,
            member: {
              '.tag': 'email',
              email: permissionId,
            },
          });
        }

        if (type == 'file') {
          this.dbx.sharingRemoveFileMember2({
            file: idSource,
            member: {
              '.tag': 'email',
              email: permissionId,
            },
          });
        }
      })
    );
  };
}
