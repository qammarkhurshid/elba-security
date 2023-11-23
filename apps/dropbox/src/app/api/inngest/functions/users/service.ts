import { elbaAccess } from '@/common/clients';
import { DBXAccess } from '@/repositories/dropbox/clients';
import { DropboxResponse, team } from 'dropbox';
import { inngest } from '../../client';
import { handleError } from '../../handle-error';

const PAGE_SIZE = 1;

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

const formatElbaUsers = (members: TeamMembers) => {
  // Invited members are not yet part of the team
  const filteredMembers = members.filter(({ profile }) => {
    return profile.status['.tag'] !== 'invited';
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

export const handler: Parameters<typeof inngest.createFunction>[2] = async ({ event, step }) => {
  if (!event.ts) {
    throw new Error('No timestamp');
  }

  const { organisationId, accessToken, isFirstScan } = event.data;
  const syncStartedAt = new Date(event.ts);

  const dbxAccess = new DBXAccess({
    accessToken,
  });

  const elba = elbaAccess(organisationId);

  let response: DropboxResponse<team.MembersListV2Result>;
  const members = await step
    .run('user-sync-initialize', async () => {
      try {
        response = await dbxAccess.teamMembersListV2({
          include_removed: false,
          limit: PAGE_SIZE,
        });
      } catch (error) {
        throw error;
      }

      const {
        result: { members, cursor, has_more: hasMore },
      } = response;

      const teamMembers = formatElbaUsers(members);

      if (!teamMembers.length) return null;

      // Sent to Elba
      await elba.users.update(teamMembers);

      return {
        cursor,
        hasMore,
      };
    })
    .catch((error) => {
      handleError(error);
    });

  if (members?.hasMore) {
    let nextProps: {
      nextCursor: string;
      nextHasMore: boolean;
    } = {
      nextCursor: members?.cursor,
      nextHasMore: members?.hasMore,
    };

    do {
      try {
        nextProps = await step.run('user-sync-paginate', async () => {
          const response = await dbxAccess.teamMembersListContinueV2({
            cursor: nextProps.nextCursor,
          });

          const {
            result: { members, has_more, cursor },
          } = response;

          // Sent to Elba
          await elba.users.update(formatElbaUsers(members));

          return { nextCursor: cursor, nextHasMore: has_more };
        });
      } catch (error) {
        handleError(error);
      }
    } while (nextProps && nextProps.nextHasMore);
  }

  await step.run('user-sync-finalize', async () => {
    await elba.users.delete({
      syncedBefore: syncStartedAt,
    });

    if (isFirstScan) {
      // TODO: Initiate first scan for the organisation
      // call third-party-apps-run-jobs
      // call data-protection-run-jobs
    }
  });
};
