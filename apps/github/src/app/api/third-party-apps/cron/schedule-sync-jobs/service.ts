import { getSchedulableInstallationIds, insertThirdPartyAppsSyncJobs } from './data';

export const scheduleThirdPartyAppsSyncJobs = async () => {
  const installationIds = await getSchedulableInstallationIds();

  if (installationIds.length === 0) {
    return { installationIds: [] };
  }

  await insertThirdPartyAppsSyncJobs(
    installationIds.map((installationId) => ({
      installationId,
      priority: 2,
    }))
  );

  return { installationIds };
};
