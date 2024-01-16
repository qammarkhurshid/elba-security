/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataProtectionPermission } from '@elba-security/schemas';
import type { files, sharing } from 'dropbox/types/dropbox_types';

export type DBXFilesOptions = {
  accessToken: string;
  adminTeamMemberId?: string;
  teamMemberId?: string;
  pathRoot?: string;
};

export type GeneralFolderFilePermissions = {
  users: sharing.UserMembershipInfo[];
  groups: sharing.GroupMembershipInfo[];
  invitees: sharing.InviteeMembershipInfo[];
  anyone?: SharedLinks[];
};

export type FolderFilePermissions = Map<string, GeneralFolderFilePermissions>;

export type SyncJob = {
  organisationId: string;
  syncStartedAt: string;
  isFirstScan: boolean;
};

export type SharedLinks = {
  url: string;
  linkAccessLevel: string;
  pathLower: string;
};

export type DBXPermissionType = DataProtectionPermission['type'];

export type FolderAndFilePermissions = {
  id: string;
  email?: string;
  team_member_id?: string;
  display_name?: string;
  type: DataProtectionPermission['type'];
  role: sharing.AccessLevel['.tag'];
  metadata?: any;
};

export type FileAndFolderType = files.FolderMetadataReference | files.FileMetadataReference;

export type FileToAdd = FileAndFolderType & {
  permissions: FolderAndFilePermissions[];
  metadata: {
    name: string;
    preview_url: string;
  };
};
