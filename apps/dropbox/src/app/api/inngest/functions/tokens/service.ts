import { DBXAuth } from '@/repositories/dropbox/clients';
import { getExpiringDropboxTokens, updateDropboxTokens } from './data';
import { DropboxResponseError } from 'dropbox';
import { addMinutes } from 'date-fns';

const REFRESH_AFTER = 60; // minutes

export type RefreshTokenResult =
  | {
      organisationId: string;
      refreshAfter: string | null;
      unauthorizedAt: string | null;
    }
  | {
      organisationId: string;
      expiresAt: string;
      accessToken: string;
    };

const refreshToken = async ({
  organisationId,
  refreshToken,
}: {
  organisationId: string;
  refreshToken: string;
}): Promise<RefreshTokenResult> => {
  const dbxAuth = new DBXAuth({
    refreshToken,
  });

  try {
    const response = await dbxAuth.refreshAccessToken();
    return {
      organisationId,
      expiresAt: response.expires_at.toISOString(),
      accessToken: response.access_token,
    };
  } catch (error) {
    if (error instanceof DropboxResponseError && error.status === 401) {
      return {
        organisationId: organisationId,
        refreshAfter: null,
        unauthorizedAt: new Date(Date.now()).toISOString(),
      };
    }
    return {
      organisationId: organisationId,
      unauthorizedAt: null,
      refreshAfter: addMinutes(new Date(), REFRESH_AFTER).toISOString(),
    };
  }
};

export async function refreshDropboxAccessTokens(request: Request) {
  const expiringTokens = await getExpiringDropboxTokens();

  if (!expiringTokens.length) {
    return {
      success: true,
      message: 'No organisations found to refresh',
      data: {
        refreshedOrganisationIds: [],
        failedOrganisationIds: [],
      },
    };
  }

  const refreshedTokens = await Promise.all(expiringTokens.map(refreshToken));

  const updatedTokens = await updateDropboxTokens(refreshedTokens);

  console.log('Expired Token Updated', {
    refreshedOrganisationIds: updatedTokens.flat().length,
  });

  return {
    success: true,
    message: 'Organisations refreshed',
    data: {
      refreshedOrganisationIds: updatedTokens.flat().length,
      failedOrganisationIds: [],
    },
  };
}
