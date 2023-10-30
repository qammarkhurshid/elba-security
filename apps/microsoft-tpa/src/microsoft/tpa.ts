import { eq } from 'drizzle-orm';
import {
  DelegatedPermissionGrant,
  deletePermissionGrantById,
  getAllDelegatedPermissionGrantsByTenantId,
  getAllServicePrincipalsById,
  getTokenByTenantId,
  ServicePrincipal,
} from 'src/common/microsoft';
import { checkOrganization } from 'src/common/utils';
import {
  PermissionGrantInsertInput,
  permissionGrants as PermissionGrantTable,
} from 'src/db/schemas/permissionGrant';
import { db } from 'src/lib/db';
import { getPermissionGrant } from '../sql/getPermissionGrant';

type ThirdPartyAppsObjectsUpsertInput = {
  organisationId: string;
  apps: {
    id: string;
    name: string;
    description: string;
    url: string;
    publisherName: string;
    logoUrl: string;
    users: {
      id: string;
      scopes: string[];
    }[];
  }[];
};

const formatThirdPartyAppsObjectUpsertInput = (
  tenantId: string,
  // Will be used whenever we decide to scan apps that require application permissions
  // servicePrincipalsWithScopes: ServicePrincipal[],
  permissionGrants: DelegatedPermissionGrant[],
  allServicePrincipals: ServicePrincipal[]
): {
  thirdPartyAppsObjects: ThirdPartyAppsObjectsUpsertInput;
  permissionGrantsObjects: PermissionGrantInsertInput[];
} => {
  const permissionGrantsObjects: PermissionGrantInsertInput[] = [];
  const apps = [
    // Will be used whenever we decide to scan apps that require application permissions
    // ...servicePrincipalsWithScopes.map((sp) =>
    //   formatServicePrincipalToThirdPartyAppObject(sp)
    // ),
    ...permissionGrants.map((pg) => {
      permissionGrantsObjects.push({
        tenantId,
        userId: pg.principalId,
        appId: pg.clientId,
        grantId: pg.id,
      });
      return formatPermissionGrantToThirdPartyAppObject(
        pg,
        allServicePrincipals.filter((sp) => sp.id === pg.clientId)[0]
      );
    }),
  ];

  const groupedApps = apps.reduce(
    (acc: Record<string, (typeof apps)[0]>, curr) => {
      if (acc[curr.id]) {
        acc[curr.id].users = [...acc[curr.id].users, ...curr.users];
      } else {
        acc[curr.id] = { ...curr };
      }
      return acc;
    },
    {}
  );

  return {
    thirdPartyAppsObjects: {
      organisationId: tenantId,
      apps: Object.values(groupedApps),
    },
    permissionGrantsObjects,
  };
};

const formatPermissionGrantToThirdPartyAppObject = (
  permissionGrant: DelegatedPermissionGrant,
  servicePrincipal: ServicePrincipal
) => ({
  id: servicePrincipal.id,
  name: servicePrincipal.appDisplayName,
  description: servicePrincipal.description,
  url: servicePrincipal.homepage,
  publisherName: servicePrincipal.verifiedPublisher?.displayName,
  logoUrl: servicePrincipal.verifiedPublisher?.logoUrl,
  users: [
    {
      id: permissionGrant.principalId,
      scopes: permissionGrant.scope.trim().split(' '),
      metadata: {
        grantId: permissionGrant.id,
      },
    },
  ],
});

// Will be used whenever we decide to scan apps that require application permissions
const formatServicePrincipalToThirdPartyAppObject = (
  servicePrincipal: ServicePrincipal
) => ({
  id: servicePrincipal.id,
  name: servicePrincipal.appDisplayName,
  description: servicePrincipal.description,
  url: servicePrincipal.homepage,
  publisherName: servicePrincipal.verifiedPublisher?.displayName,
  logoUrl: servicePrincipal.verifiedPublisher?.logoUrl,
  users: [
    {
      id: servicePrincipal.appRoleAssignedTo,
      scopes: servicePrincipal.appScopes,
    },
  ],
});

export const scanThirdPartyAppsByTenantId = async (tenantId: string) => {
  await checkOrganization(tenantId);
  const { accessToken } = await getTokenByTenantId(tenantId);
  const permissionGrants = await getAllDelegatedPermissionGrantsByTenantId({
    accessToken,
    tenantId,
  });
  const allServicePrincipals = await getAllServicePrincipalsById({
    accessToken,
    tenantId,
  });

  // Will be used whenever we decide to scan apps that require application permissions
  // const servicePrincipalsWithScopes = await Promise.all(
  //   allServicePrincipals
  //     .filter((sp) =>
  //       sp.tags?.includes("WindowsAzureActiveDirectoryIntegratedApp")
  //     )
  //     .map(async (sp) => {
  //       const appRoleAssignedTo =
  //         await getServicePrincipalAppRoleAssignedToById({
  //           tenantId,
  //           accessToken,
  //           appId: sp.id,
  //         });
  //       return {
  //         ...sp,
  //         appScopes: sp.appRoleAssignments.map(
  //           (assignment) =>
  //             allServicePrincipals
  //               .filter((sp) => sp.id === assignment.resourceId)[0]
  //               .appRoles.filter((role) => role.id === assignment.appRoleId)[0]
  //               .value
  //         ),
  //         appRoleAssignedTo: appRoleAssignedTo.appRoleAssignedTo[0].principalId,
  //       };
  //     })
  // );

  const { thirdPartyAppsObjects, permissionGrantsObjects } =
    formatThirdPartyAppsObjectUpsertInput(
      tenantId,
      // Will be used whenever we decide to scan apps that require application permissions
      // servicePrincipalsWithScopes,
      permissionGrants,
      allServicePrincipals
    );

  await db
    .insert(PermissionGrantTable)
    .values(permissionGrantsObjects)
    .onConflictDoNothing();
  return { thirdPartyAppsObjects, permissionGrantsObjects };
};

export const deletePermissionGrant = async ({
  tenantId,
  userId,
  appId,
  grantId,
}: {
  tenantId: string;
  userId: string;
  appId: string;
  grantId: string;
}) => {
  await checkOrganization(tenantId);
  const { accessToken } = await getTokenByTenantId(tenantId);
  const permissionGrant = await getPermissionGrant({
    tenantId,
    appId,
    userId,
    grantId,
  });
  await deletePermissionGrantById({
    accessToken,
    tenantId,
    id: permissionGrant.grantId,
  });
  await db
    .delete(PermissionGrantTable)
    .where(eq(PermissionGrantTable.id, permissionGrant.id));

  return { message: 'Permission grant deleted' };
};
