import { inngest } from '@/app/api/inngest/client';
import { activateOrganisation, getOrganisationWithInstallation } from './data';

export const handleElbaOrganisationActivated = async (organisationId: string) => {
  const { organisation, installation } = await getOrganisationWithInstallation(organisationId);

  if (organisation.isActivated) {
    return { success: false, message: 'Organisation is already activated' };
  }

  await activateOrganisation(organisationId);
  await inngest.send({
    name: 'third-party-apps/scan',
    data: {
      installationId: installation.id,
      isFirstScan: true,
    },
  });

  return { success: true };
};
