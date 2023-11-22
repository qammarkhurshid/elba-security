import { InferModel, InferSelectModel, and, asc, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { db, tokens } from '@/database';
import { addMinutes } from 'date-fns';
import { RefreshTokenResult } from './refresh-dropbox-tokens';

const EXPIRES_BEFORE = 30;
const SELECT_TOKENS_BATCH_SIZE = 20;

export type TokensToRefresh = Awaited<ReturnType<typeof getExpiringDropboxTokens>>;
export type RefreshTokens = Pick<
  InferSelectModel<typeof tokens>,
  'accessToken' | 'expiresAt' | 'refreshAfter' | 'unauthorizedAt' | 'organisationId'
>;

export const getExpiringDropboxTokens = async () => {
  return await db
    .select({
      organisationId: tokens.organisationId,
      refreshToken: tokens.refreshToken,
    })
    .from(tokens)
    .limit(SELECT_TOKENS_BATCH_SIZE)
    .orderBy(asc(tokens.expiresAt))
    .where(
      and(
        lte(tokens.expiresAt, addMinutes(new Date(), EXPIRES_BEFORE).toISOString()),
        isNull(tokens.unauthorizedAt),
        or(
          isNull(tokens.refreshAfter),
          lte(tokens.refreshAfter, new Date(Date.now()).toISOString())
        )
      )
    );
};

export const updateDropboxTokens = async (accessTokenDetails: RefreshTokenResult[]) => {
  try {
    // TODO: Try to use this instead of the for loop below
    // https://www.answeroverflow.com/m/1113470358964678809
    const promises = accessTokenDetails.map(({ organisationId, ...rest }) => {
      return db
        .update(tokens)
        .set({
          ...rest,
          updatedAt: sql`now()`,
        })
        .where(eq(tokens.organisationId, organisationId))
        .returning({ organisationId: tokens.organisationId, updatedAt: tokens.updatedAt });
    });
    return Promise.all(promises);
  } catch (error) {
    throw error;
  }
};
