import { eq } from 'drizzle-orm';
import { Installation, Organisation, db } from '@/database';

export const getOrganisationWithInstallation = async (organisationId: string) => {
  const [result] = await db
    .select()
    .from(Organisation)
    .leftJoin(Installation, eq(Installation.organisationId, Organisation.id))
    .where(eq(Organisation.id, organisationId));

  if (!result?.organisation) {
    throw new Error(`Could not retrieve an organisation with id=${organisationId}`);
  }

  if (!result.installation) {
    throw new Error(`Could not retrieve an installation with organisationId=${organisationId}`);
  }

  return { organisation: result.organisation, installation: result.installation };
};

export const activateOrganisation = async (organisationId: string) =>
  db.update(Organisation).set({ isActivated: true }).where(eq(Organisation.id, organisationId));
