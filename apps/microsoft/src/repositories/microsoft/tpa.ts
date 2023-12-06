/* eslint-disable @typescript-eslint/no-non-null-assertion -- TODO : disable this rule */
import { eq } from 'drizzle-orm';
import type { ThirdPartyAppsObject } from '@elba-security/sdk';
import { getPermissionGrant } from '@/repositories/integration/permission-grant';
import type {
  MicrosoftGraphAPIResponse,
  SafeMicrosoftGraphPermissionGrant,
  SafeMicrosoftGraphServicePrincipal,
} from '@/common/microsoft';
import {
  getPaginatedDelegatedPermissionGrantsByTenantId,
  deletePermissionGrantById,
  getAllServicePrincipalsById,
  getTokenByTenantId,
} from '@/common/microsoft';
import { checkOrganization } from '@/common/utils';
import type { PermissionGrantInsertInput } from '@/schemas/permission-grant';
import { permissionGrants as PermissionGrantTable } from '@/schemas/permission-grant';
import { db } from '@/lib/db';

type ThirdPartyAppsObjectsUpsertInput = {
  apps: ThirdPartyAppsObject[];
};

const formatThirdPartyAppsObjectUpsertInput = (
  tenantId: string,
  // Will be used whenever we decide to scan apps that require application permissions
  // servicePrincipalsWithScopes: ServicePrincipal[],
  permissionGrants: MicrosoftGraphAPIResponse<SafeMicrosoftGraphPermissionGrant>,
  allServicePrincipals: SafeMicrosoftGraphServicePrincipal[]
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
    ...permissionGrants.value.map((pg) => {
      permissionGrantsObjects.push({
        tenantId,
        userId: pg.principalId,
        appId: pg.clientId,
        grantId: pg.id,
      });
      const servicePrincipal = allServicePrincipals.filter((sp) => sp.id === pg.clientId)[0];
      if (!servicePrincipal) {
        throw new Error(`Service principal not found for permission grant ${pg.id}`);
      }
      return formatPermissionGrantToThirdPartyAppObject(pg, servicePrincipal);
    }),
  ];

  const groupedApps = apps.reduce((acc: Record<string, (typeof apps)[0]>, curr) => {
    if (acc[curr.id]) {
      const existingApp = acc[curr.id]!;
      existingApp.users = [...existingApp.users, ...curr.users];
    } else {
      acc[curr.id] = { ...curr };
    }
    return acc;
  }, {});

  return {
    thirdPartyAppsObjects: {
      apps: Object.values(groupedApps),
    },
    permissionGrantsObjects,
  };
};

const formatPermissionGrantToThirdPartyAppObject = (
  permissionGrant: SafeMicrosoftGraphPermissionGrant,
  servicePrincipal: SafeMicrosoftGraphServicePrincipal
) => ({
  id: servicePrincipal.id,
  name: servicePrincipal.appDisplayName,
  description: servicePrincipal.description,
  url: servicePrincipal.homepage,
  logoUrl: servicePrincipal.logoUrl,
  publisherName: servicePrincipal.publisherName,
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
// const formatServicePrincipalToThirdPartyAppObject = (
//   servicePrincipal: MicrosoftGraph.ServicePrincipal
// ) => ({
//   id: servicePrincipal.id,
//   name: servicePrincipal.appDisplayName,
//   description: servicePrincipal.description,
//   url: servicePrincipal.homepage,
//   publisherName: servicePrincipal.verifiedPublisher?.displayName,
//   users: [
//     {
//       id: servicePrincipal.appRoleAssignedTo,
//       scopes: servicePrincipal.appScopes,
//     },
//   ],
// });

export const scanThirdPartyAppsByTenantId = async ({
  tenantId,
  accessToken,
  pageLink,
}: {
  tenantId: string;
  accessToken: string;
  pageLink: string | undefined;
}) => {
  const permissionGrants = await getPaginatedDelegatedPermissionGrantsByTenantId({
    accessToken,
    tenantId,
    pageLink,
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

  const { thirdPartyAppsObjects, permissionGrantsObjects } = formatThirdPartyAppsObjectUpsertInput(
    tenantId,
    // Will be used whenever we decide to scan apps that require application permissions
    // servicePrincipalsWithScopes,
    permissionGrants,
    allServicePrincipals
  );

  await db.insert(PermissionGrantTable).values(permissionGrantsObjects).onConflictDoNothing();
  return {
    thirdPartyAppsObjects,
    permissionGrantsObjects,
    pageLink: permissionGrants['@odata.nextLink'],
  };
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
  await db.delete(PermissionGrantTable).where(eq(PermissionGrantTable.id, permissionGrant.id));

  return { message: 'Permission grant deleted' };
};
