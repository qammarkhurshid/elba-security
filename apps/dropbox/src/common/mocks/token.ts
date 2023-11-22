import { tokens, db } from '@/database';
import { addMinutes, addSeconds } from 'date-fns';
import { and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';

const ORGANISATION_ID = '65a9f078-5ab6-4f87-a9e9-cbe91d797562';
const expiresAt = addSeconds(new Date(), 100).toISOString();

const defaultAccessToken = {
  organisationId: ORGANISATION_ID,
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresAt,
  adminTeamMemberId: 'test-team-member-id',
  rootNamespaceId: '123653255',
  teamName: 'test-team-name',
};

export const insertTestAccessToken = async (tokenDetails = defaultAccessToken) => {
  try {
    // await db.delete(tokens);
    return db
      .insert(tokens)
      .values(tokenDetails)
      .returning({ organisationId: tokens.organisationId, updatedAt: tokens.updatedAt });
  } catch (error) {
    throw error;
  }
};
