import * as jose from 'jose';
import { env } from 'src/env';

type MicrosoftGraphTokenResponse = {
  token_type: string;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
};

export type DelegatedPermissionGrant = {
  clientId: string;
  id: string;
  principalId: string;
  scope: string;
};

export type ServicePrincipal = {
  id: string;
  appDisplayName: string;
  description: string;
  homepage: string;
  verifiedPublisher: {
    displayName: string;
    logoUrl: string;
  };
  tags: string[];
  appRoleAssignments: {
    appRoleId: string;
    resourceId: string;
  }[];
  appRoles: {
    id: string;
    value: string;
  }[];
  appRoleAssignedTo: string;
  appScopes: string[];
};

export type User = {
  id: string;
  mail?: string;
  userPrincipalName?: string;
  displayName: string;
  otherMails?: string[];
};

const MAX_RESULTS_PER_PAGE = 999;

export type MicrosoftAppScope =
  | 'DelegatedPermissionGrant.ReadWrite.All'
  | 'Application.ReadWrite.All'
  | 'User.Read.All';

export const getTokenByTenantId = async (tenantId: string) => {
  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
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
    }
  );
  const json = (await response.json()) as MicrosoftGraphTokenResponse;
  const decodedToken = jose.decodeJwt(json.access_token);
  return {
    accessToken: json.access_token,
    scopes: (decodedToken?.roles as MicrosoftAppScope[]) ?? [],
  };
};

export const getPaginatedDelegatedPermissionGrantsByTenantId = async ({
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
      `https://graph.microsoft.com/v1.0/${tenantId}/oauth2PermissionGrants?$filter=consentType eq 'Principal'`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return response.json();
};

export const getAllDelegatedPermissionGrantsByTenantId = async ({
  accessToken,
  tenantId,
}: {
  accessToken: string;
  tenantId: string;
}): Promise<DelegatedPermissionGrant[]> => {
  let allFetched = false;
  let pageLink = undefined;
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

  return response.json();
};

export const getAllServicePrincipalsById = async ({
  accessToken,
  tenantId,
}: {
  accessToken: string;
  tenantId: string;
}): Promise<ServicePrincipal[]> => {
  let allFetched = false;
  let pageLink = undefined;
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
  pageLink?: string;
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

  return response.json();
};

export const getAllUsersByTenantId = async ({
  accessToken,
  tenantId,
}: {
  accessToken: string;
  tenantId: string;
}): Promise<User[]> => {
  let allFetched = false;
  let pageLink = undefined;
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
