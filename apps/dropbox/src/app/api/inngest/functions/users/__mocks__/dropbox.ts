import { team } from 'dropbox';

export const membersListFirstPage = (users: number[]) =>
  users.map((id) => ({
    profile: {
      team_member_id: `dbmid:team-member-id-${id}`,
      account_id: `dbid:team-member-account-id-${id}`,
      email: `team-member-email-${id}@foo.bar`,
      email_verified: true,
      secondary_emails: [
        {
          email: `team-member-second-email-${id}@foo.com`,
          is_verified: true,
        },
        {
          email: `team-member-second-email@bar.com`,
          is_verified: false,
        },
      ],
      status: {
        '.tag': 'active',
      },
      name: {
        given_name: `team-member-given-name-${id}`,
        surname: `team-member-surname-${id}`,
        familiar_name: `team-member-familiar-name-${id}`,
        display_name: `team-member-display-name-${id}`,
        abbreviated_name: `team-member-abbreviated-name-${id}`,
      },
      membership_type: {
        '.tag': 'full',
      },
      joined_on: '2023-01-19T13:09:04Z',
      groups: [`g:000000000000${id}`],
      member_folder_id: '01234567${i}',
    },
  }));

export const membersList: team.TeamMemberInfoV2[] = membersListFirstPage([
  1, 2, 3,
]) as team.TeamMemberInfoV2[];

// Expected Result
export const elbaUsers = {
  users: [
    {
      additionalEmails: ['team-member-second-email-1@foo.com', 'team-member-second-email@bar.com'],
      displayName: 'team-member-display-name-1',
      email: 'team-member-email-1@foo.bar',
      id: 'dbmid:team-member-id-1',
    },
    {
      additionalEmails: ['team-member-second-email-2@foo.com', 'team-member-second-email@bar.com'],
      displayName: 'team-member-display-name-2',
      email: 'team-member-email-2@foo.bar',
      id: 'dbmid:team-member-id-2',
    },
    {
      additionalEmails: ['team-member-second-email-3@foo.com', 'team-member-second-email@bar.com'],
      displayName: 'team-member-display-name-3',
      email: 'team-member-email-3@foo.bar',
      id: 'dbmid:team-member-id-3',
    },
  ],
};

export const membersListSecondPage: team.TeamMemberInfoV2[] = [
  {
    profile: {
      team_member_id: 'dbmid:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      account_id: 'dbid:zdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikpva',
      email: 'member-20@elba.security',
      email_verified: false,
      secondary_emails: [],
      status: {
        '.tag': 'active',
      },
      name: {
        given_name: 'member-20-name',
        surname: 'member-20-surname',
        familiar_name: 'member-20-familiar-name',
        display_name: 'member-20-display-name',
        abbreviated_name: 'member-20-abbreviated-name',
      },
      membership_type: {
        '.tag': 'full',
      },
      invited_on: '2023-01-30T19:05:23Z',
      groups: ['g:21e7390f3226aa560000000000000003'],
      member_folder_id: '3465994753',
    },
  },
  {
    profile: {
      team_member_id: 'dbmid:wRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      account_id: 'dbid:zdWIiOiIxMjM0NTY3ODasdaUOIawibmFtZSI6Ikpva',
      email: 'member-21@elba.security',
      email_verified: false,
      secondary_emails: [],
      status: {
        '.tag': 'active',
      },
      name: {
        given_name: 'member-21-name',
        surname: 'member-21-surname',
        familiar_name: 'member-21-familiar-name',
        display_name: 'member-21-display-name',
        abbreviated_name: 'member-21-abbreviated-name',
      },
      membership_type: {
        '.tag': 'full',
      },
      invited_on: '2023-01-30T19:05:23Z',
      groups: ['g:21e7390f3226aa560000000000000003'],
      member_folder_id: '3567894753',
    },
  },
];
