import { db } from '@/lib/db';
import { syncJobs } from '@/schemas/syncJob';
import { eq, asc, sql } from 'drizzle-orm';
import { getPermissionGrant } from '@/repositories/integration/permissionGrant';
import {
  deletePermissionGrantById,
  getAllServicePrincipalsById,
  getTokenByTenantId,
} from '@/common/microsoft';
import { checkOrganization } from '@/common/utils';
import { PermissionGrantInsertInput } from '@/schemas/permissionGrant';
import { permissionGrants as PermissionGrantTable } from '@/schemas/permissionGrant';
import {
  DelegatedPermissionGrant,
  getPaginatedDelegatedPermissionGrantsByTenantId,
  ServicePrincipal,
} from '@/common/microsoft';
import { organizations } from '@/schemas/organization';

interface ThirdPartyAppsObjectsUpsertInput {
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
}

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

  const groupedApps = apps.reduce((acc: Record<string, (typeof apps)[0]>, curr) => {
    if (acc[curr.id]) {
      acc[curr.id].users = [...acc[curr.id].users, ...curr.users];
    } else {
      acc[curr.id] = { ...curr };
    }
    return acc;
  }, {});

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
const formatServicePrincipalToThirdPartyAppObject = (servicePrincipal: ServicePrincipal) => ({
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

export const scanThirdPartyAppsByTenantId = async (tenantId: string, pageLink: string | null) => {
  await checkOrganization(tenantId);
  const { accessToken } = await getTokenByTenantId(tenantId);
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

export const startThirdPartyAppsSyncJobs = async () => {
  try {
    const orgToSync = await db.select().from(syncJobs).orderBy(asc(syncJobs.createdAt)).limit(1);
    if (!orgToSync[0]) {
      return new Response('No organization to sync', { status: 200 });
    }
    const result = await scanThirdPartyAppsByTenantId(
      orgToSync[0].tenantId,
      orgToSync[0].paginationToken
    );
    await db.delete(syncJobs).where(eq(syncJobs.id, orgToSync[0].id));
    if (!result.pageLink) {
      await db
        .update(organizations)
        .set({ lastTpaScan: sql`now()` })
        .where(eq(organizations.id, orgToSync[0].id));
    } else {
      await db.insert(syncJobs).values({
        tenantId: orgToSync[0].tenantId,
        type: 'apps',
        paginationToken: result.pageLink,
      });
    }
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (e) {
    return new Response(e, { status: 500 });
  }
};
