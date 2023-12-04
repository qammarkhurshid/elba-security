import type { WebhookEvent } from '@octokit/webhooks-types';
import { Elba } from '@elba-security/sdk';
import { env } from '@/env';
import {
  deleteInstallation,
  getInstallation,
  suspendInstallation,
  unsuspendInstallation,
} from './data';

const isSupportedAction = (action: string): action is SupportedAction => {
  // @ts-expect-error -- conveniency
  return SUPPORTED_ACTIONS.includes(action);
};

const SUPPORTED_ACTIONS = ['deleted', 'suspend', 'unsuspend'] as const;

type SupportedAction = (typeof SUPPORTED_ACTIONS)[number];

export const handleGithubWebhookEvent = async (event: WebhookEvent) => {
  if (
    !(
      'action' in event &&
      'installation' in event &&
      // eslint-disable-next-line eqeqeq -- not null or not undefined but 0 accepted
      event.installation?.id != null &&
      isSupportedAction(event.action)
    )
  ) {
    return { ignored: true };
  }
  const installationId = event.installation.id;
  const installation = await getInstallation(installationId);

  const elba = new Elba({
    organisationId: installation.organisationId,
    sourceId: env.ELBA_SOURCE_ID,
    apiKey: env.ELBA_API_KEY,
    baseUrl: env.ELBA_API_BASE_URL,
  });

  switch (event.action) {
    case 'suspend':
      await suspendInstallation(installationId);
      return elba.connectionStatus.update({ hasError: true });
    case 'unsuspend':
      await unsuspendInstallation(installationId);
      return elba.connectionStatus.update({ hasError: false });
    case 'deleted':
      await deleteInstallation(installationId);
      return elba.connectionStatus.update({ hasError: true });
  }
};
