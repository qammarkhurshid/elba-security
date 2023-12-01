import { env } from '@/common/env';

export const slackUserScopes = [
  'channels:history',
  'channels:read',
  'team:read',
  'users:read',
  'users:read.email',
];

export const getSlackMissingScopes = (scope: string) => {
  const scopes = new Set(scope.split(','));
  const missingScopes: string[] = [];

  for (const slackUserScope of slackUserScopes) {
    if (!scopes.has(slackUserScope)) {
      missingScopes.push(slackUserScope);
    }
  }

  return missingScopes;
};

export const getSlackInstallationUrl = (state: string) => {
  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.searchParams.append('client_id', env.SLACK_CLIENT_ID);
  url.searchParams.append('user_scope', slackUserScopes.join(','));
  url.searchParams.append('state', state);

  return url.toString();
};
