import { SlackAPIClient } from 'slack-web-api-client';
import { env } from '@/common/env';
import { getSlackMissingScopes } from '@/repositories/slack/oauth';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { slackTeamSchema } from '@/repositories/slack/teams';
import { inngest } from '@/inngest/client';

export const handleSlackInstallation = async ({
  organisationId,
  code,
}: {
  organisationId: string;
  code: string;
}) => {
  const response = await new SlackAPIClient().oauth.v2.access({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
  });

  console.log(JSON.stringify(response));

  if (response.authed_user?.token_type !== 'user') {
    throw new Error('Unsupported token type');
  }

  if (!response.authed_user.scope) {
    throw new Error('No scopes provided');
  }

  const missingScopes = getSlackMissingScopes(response.authed_user.scope);
  if (missingScopes.length) {
    throw new Error('Missing OAuth scopes');
  }

  if (response.is_enterprise_install) {
    throw new Error('Slack enterprise is not supported');
  }

  const accessToken = response.authed_user.access_token;
  if (!accessToken) {
    throw new Error('No access token provided');
  }

  // TODO: is admin

  const { team } = await new SlackAPIClient().team.info({
    token: accessToken,
  });

  const result = slackTeamSchema.safeParse(team);
  if (!result.success) {
    throw new Error('Failed to retrieve team info');
  }

  await db
    .insert(teams)
    .values({
      id: result.data.id,
      elbaOrganisationId: organisationId,
      url: result.data.url,
      token: accessToken,
    })
    .onConflictDoUpdate({
      target: [teams.id],
      set: {
        url: result.data.url,
        token: accessToken,
      },
    });

  await inngest.send({
    name: 'users/synchronize',
    data: {
      teamId: result.data.id,
      isFirstSync: true,
      syncStartedAt: Date.now(),
    },
  });
};
