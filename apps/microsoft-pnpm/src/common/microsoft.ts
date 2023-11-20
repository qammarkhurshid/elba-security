import * as jose from 'jose';
import type * as MicrosoftGraph from 'microsoft-graph';
import { env } from './env';

type MicrosoftGraphCoreResponse = {
  '@odata.context': string;
  '@odata.nextLink'?: string;
};

type MicrosoftGraphPermissionGrantResponse = {
  value: MicrosoftGraph.OAuth2PermissionGrant[];
} & MicrosoftGraphCoreResponse;

type MicrosoftGraphServicePrincipalResponse = {
  value: MicrosoftGraph.ServicePrincipal[];
} & MicrosoftGraphCoreResponse;

type MicrosoftGraphUserResponse = {
  value: MicrosoftGraph.User[];
} & MicrosoftGraphCoreResponse;

type MicrosoftGraphTokenResponse = {
  token_type: string;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
};

const MAX_RESULTS_PER_PAGE = 999;

export type MicrosoftAppScope =
  | 'DelegatedPermissionGrant.ReadWrite.All'
  | 'Application.ReadWrite.All'
  | 'User.Read.All';

export const getTokenByTenantId = async (tenantId: string) => {
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.MICROSOFT_TPAC_APP_CLIENT_ID,
      client_secret: env.MICROSOFT_TPAC_APP_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
    }),
  });
  const json = await response.json();
  const decodedToken = jose.decodeJwt(json.access_token);
  return {
    accessToken: json.access_token,
    scopes: (decodedToken.roles as MicrosoftAppScope[]) ?? [],
  };
};

export const getPaginatedDelegatedPermissionGrantsByTenantId = async ({
  accessToken,
  tenantId,
  pageLink,
}: {
  accessToken: string;
  tenantId: string;
  pageLink: string | null;
}) => {
  const response = await fetch(
    pageLink ??
      `https://graph.microsoft.com/v1.0/${tenantId}/oauth2PermissionGrants?$filter=consentType eq 'Principal'`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return (await response.json()) as MicrosoftGraphPermissionGrantResponse;
};

export const getAllDelegatedPermissionGrantsByTenantId = async ({
  accessToken,
  tenantId,
}: {
  accessToken: string;
  tenantId: string;
}): Promise<MicrosoftGraph.OAuth2PermissionGrant[]> => {
  let allFetched = false;
  let pageLink;
  const aggregatedResults = [];

  while (!allFetched) {
    const response = await getPaginatedDelegatedPermissionGrantsByTenantId({
      accessToken,
      tenantId,
      pageLink,
    });
    aggregatedResults.push(response.value);

    if (response['@odata.nextLink']) {
      allFetched = false;
      pageLink = response['@odata.nextLink'];
    } else {
      allFetched = true;
    }
  }
  return aggregatedResults.flat();
};

export const getServicePrincipalAppRoleAssignedToById = async ({
  tenantId,
  accessToken,
  appId,
}: {
  tenantId: string;
  accessToken: string;
  appId: string;
}) => {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/${tenantId}/servicePrincipals/${appId}?$select=id&$expand=appRoleAssignedTo`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.json();
};

export const getPaginatedServicePrincipalsByTenantId = async ({
  accessToken,
  tenantId,
  pageLink,
}: {
  accessToken: string;
  tenantId: string;
  pageLink?: string;
}) => {
  const response = await fetch(
    pageLink ??
      `https://graph.microsoft.com/v1.0/${tenantId}/servicePrincipals?$top=${MAX_RESULTS_PER_PAGE}&$select=appDisplayName,description,id,homepage,info,verifiedPublisher,tags,appRoles&$expand=appRoleAssignments`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return (await response.json()) as MicrosoftGraphServicePrincipalResponse;
};

export const getAllServicePrincipalsById = async ({
  accessToken,
  tenantId,
}: {
  accessToken: string;
  tenantId: string;
}): Promise<MicrosoftGraph.ServicePrincipal[]> => {
  let allFetched = false;
  let pageLink;
  const aggregatedResults = [];

  while (!allFetched) {
    const response = await getPaginatedServicePrincipalsByTenantId({
      accessToken,
      tenantId,
      pageLink,
    });
    aggregatedResults.push(response.value);

    if (response['@odata.nextLink']) {
      allFetched = false;
      pageLink = response['@odata.nextLink'];
    } else {
      allFetched = true;
    }
  }
  return aggregatedResults.flat();
};

export const getPaginatedUsersByTenantId = async ({
  accessToken,
  tenantId,
  pageLink,
}: {
  accessToken: string;
  tenantId: string;
  pageLink: string | null;
}) => {
  const response = await fetch(
    pageLink ??
      `https://graph.microsoft.com/v1.0/${tenantId}/users?$top=${MAX_RESULTS_PER_PAGE}&$select=id,mail,userPrincipalName,displayName`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return (await response.json()) as MicrosoftGraphUserResponse;
};

export const getAllUsersByTenantId = async ({
  accessToken,
  tenantId,
}: {
  accessToken: string;
  tenantId: string;
}): Promise<MicrosoftGraph.User[]> => {
  let allFetched = false;
  let pageLink;
  const aggregatedResults = [];

  while (!allFetched) {
    const response = await getPaginatedUsersByTenantId({
      accessToken,
      tenantId,
      pageLink,
    });
    aggregatedResults.push(response.value);

    if (response['@odata.nextLink']) {
      allFetched = false;
      pageLink = response['@odata.nextLink'];
    } else {
      allFetched = true;
    }
  }
  return aggregatedResults.flat();
};

export const deletePermissionGrantById = async ({
  tenantId,
  accessToken,
  id,
}: {
  tenantId: string;
  accessToken: string;
  id: string;
}) => {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/${tenantId}/oauth2PermissionGrants/${id}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.json();
};

export const formatMicrosoftConsentUrl = () =>
  `https://login.microsoftonline.com/organizations/adminconsent?client_id=${env.MICROSOFT_TPAC_APP_CLIENT_ID}&redirect_uri=${env.MICROSOFT_TPAC_APP_REDIRECT_URI}`;
