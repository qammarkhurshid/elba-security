import { elbaAccess } from '@/common/clients';
import { DBXAccess } from '@/repositories/dropbox/clients';
import { DropboxResponse, team } from 'dropbox';

const PAGE_SIZE = 1000;

type syncOrganisationUsers = {
  organisationId: string;
  accessToken: string;
};

type TeamMembers = team.MembersListV2Result['members'];

type ElbaUserType = {
  id: string;
  email: string;
  displayName: string;
  additionalEmails: string[];
};

export const fetchMoreDropboxMembers = async ({
  dbxAccess,
  firstCursor,
}: {
  dbxAccess: DBXAccess;
  firstCursor: string;
}) => {
  try {
    let isLastPage = false;
    let pageCursor: string = firstCursor;
    let allMembers: TeamMembers = [];

    while (!isLastPage) {
      const response = await dbxAccess.teamMembersListContinueV2({
        cursor: pageCursor,
      });

      const {
        result: { members, has_more, cursor },
      } = response;

      pageCursor = cursor;
      allMembers = [...allMembers, ...members];

      if (!has_more) {
        isLastPage = true;
      }
    }

    return allMembers;
  } catch (error) {
    throw error;
  }
};

const formatElbaUser = (members: TeamMembers) => {
  const filteredMembers = members.filter(({ profile }) => {
    return profile.status['.tag'] !== 'invited'; // Invited members are not yet part of the team
  });

  return filteredMembers.map<ElbaUserType>(({ profile }) => {
    const {
      team_member_id,
      email,
      secondary_emails,
      name: { display_name },
    } = profile;

    return {
      id: team_member_id,
      email: email,
      displayName: display_name,
      additionalEmails: secondary_emails?.map(({ email }: { email: string }) => email) || [],
    };
  });
};

export const syncOrganisationUsers = async (event) => {
  if (!event.ts) {
    throw new Error('No timestamp');
  }

  const { organisationId, accessToken } = event.data;

  const dbxAccess = new DBXAccess({
    accessToken,
  });

  const elba = elbaAccess(organisationId);

  let response: DropboxResponse<team.MembersListV2Result>;

  try {
    response = await dbxAccess.teamMembersListV2({
      include_removed: false,
      limit: PAGE_SIZE,
    });
  } catch (error) {
    throw error;
  }

  const {
    result: { members, cursor, has_more },
  } = response;

  let allTeamMembers: ElbaUserType[] = [];

  allTeamMembers = formatElbaUser(members);

  if (has_more) {
    const moreMembers = await fetchMoreDropboxMembers({
      dbxAccess,
      firstCursor: cursor,
    });

    allTeamMembers = [...allTeamMembers, ...formatElbaUser(moreMembers)];
  }

  if (!allTeamMembers.length) {
    return {
      success: true,
      message: 'No users found',
    };
  }

  try {
    await elba.users.update(allTeamMembers);
    await elba.users.delete({
      syncedBefore: new Date(event.ts),
    });
  } catch (error) {
    throw error;
  }

  return {
    success: true,
  };
};
