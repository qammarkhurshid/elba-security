import { eq, isNull } from 'drizzle-orm';
import type { PgInsertValue } from 'drizzle-orm/pg-core';
import { db, Tokens } from '@/database';

// export const getSchedulableInstallationIds = async () => {
//   const installations = await db
//     .select({
//       id: Installation.id,
//     })
//     .from(Installation)
//     .leftJoin(UsersSyncJob, eq(Installation.id, UsersSyncJob.installationId))
//     .where(isNull(UsersSyncJob.installationId));
//   return installations.map(({ id }) => id);
// };

export const insertAccessToken = async (accessTokenDetails: PgInsertValue<typeof Tokens>) => {
  return await db
    .insert(Tokens)
    .values(accessTokenDetails)
    .onConflictDoUpdate({
      target: [Tokens.organisationId],
      set: {
        accessToken: accessTokenDetails.accessToken as string,
        refreshToken: accessTokenDetails.refreshToken as string,
        teamName: accessTokenDetails.teamName as string,
        adminTeamMemberId: accessTokenDetails.adminTeamMemberId as string,
        rootNamespaceId: accessTokenDetails.rootNamespaceId as string,
        expiresAt: accessTokenDetails.expiresAt as Date,
      },
    });
};
