import { logger } from "@elba-security/logger"
import { eq } from "drizzle-orm";
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';


type UpdateOrganisationParams = {
  authToken: string;
  organisationId:string;
};

type FindOrganisationParams = {
  organisationId:string;
}

type OrganizationRecordObject = {
  id: string;
  region: string;
  createdAt: string; 
  domain: string;
  client_id: string;
  client_secret: string;
  auth_token: string;
}


export const updateOrganization = async ({organisationId, authToken}: UpdateOrganisationParams)=>{
  logger.info(`Setting up organization, ${organisationId} ${authToken}`);

  await db.update(Organisation)
  .set({ auth_token: authToken })
  .where(eq(Organisation.id, organisationId))
}

export const findOrganisation = async ({organisationId}: FindOrganisationParams): Promise<OrganizationRecordObject[]>=>{
  logger.info(`Finding the organisation with id ${organisationId}`);
  const organisation = await db.select().from(Organisation).where(eq(Organisation.id, organisationId));
  return organisation as OrganizationRecordObject[] | [];
} 