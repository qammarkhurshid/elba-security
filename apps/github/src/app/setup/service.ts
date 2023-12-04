import { getInstallation } from '@/repositories/github/installation';
import { inngest } from '../api/inngest/client';
import { insertInstallation } from './data';

export const setupInstallation = async (installationId: number, organisationId: string) => {
  const installation = await getInstallation(installationId);

  if (installation.account.type !== 'Organization') {
    throw new Error('Cannot install elba github app on an account that is not an organization');
  }

  if (installation.suspended_at) {
    throw new Error('Installation is suspended');
  }

  const appInstallation = await insertInstallation({
    id: installation.id,
    accountId: installation.account.id,
    accountLogin: installation.account.login,
    organisationId,
  });

  await inngest.send({
    name: 'users/scan',
    data: {
      installationId: installation.id,
      isFirstScan: true,
    },
  });

  return appInstallation;
};
