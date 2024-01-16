import { UpdateUsers } from '@elba-security/schemas';
import { team } from 'dropbox';

export const formUsers = (members: team.TeamMemberInfoV2[]) => {
  // Invited members are not yet part of the team
  const filteredMembers = members.filter(({ profile }) => {
    return ['active', 'suspended'].includes(profile.status['.tag']) && !!profile.name.display_name;
  });

  return filteredMembers.map<UpdateUsers['users'][0]>(({ profile }) => {
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
