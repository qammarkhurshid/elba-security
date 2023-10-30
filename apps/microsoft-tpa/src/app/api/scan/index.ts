import { eq, lte } from 'drizzle-orm';
import { organizations } from 'src/db/schemas/organization';
import { checkZeploSecretKey } from 'src/hooks/checkZeploSecretKey';
import { db } from 'src/lib/db';
import { scanThirdPartyAppsByTenantId } from 'src/microsoft/tpa';
import { scanUsersByTenantId } from 'src/microsoft/users';
import { createElysia } from 'src/util/elysia';

export const routes = createElysia({ prefix: '/scan' })
  .post(
    '/tpa',
    async ({ set }) => {
      try {
        const orgToSync = await db
          .select()
          .from(organizations)
          .where(
            lte(
              organizations.lastUserScan,
              new Date(Date.now() - 1000 * 60 * 60)
            )
          )
          .limit(1);
        if (!orgToSync[0]) {
          set.status = 200;
          return { message: 'No organizations to sync' };
        }
        const result = await scanThirdPartyAppsByTenantId(
          orgToSync[0].tenantId
        );
        await db
          .update(organizations)
          .set({ lastUserScan: new Date() })
          .where(eq(organizations.id, orgToSync[0].id));
        set.status = 200;
        return result;
      } catch (e) {
        set.status = 500;
        return e;
      }
    },
    { beforeHandle: [checkZeploSecretKey] }
  )
  .post(
    '/users',
    async ({ set }) => {
      try {
        const orgToSync = await db
          .select()
          .from(organizations)
          .where(
            lte(
              organizations.lastUserScan,
              new Date(Date.now() - 1000 * 60 * 60)
            )
          )
          .limit(1);
        if (!orgToSync[0]) {
          set.status = 200;
          return { message: 'No organizations to sync' };
        }
        const result = await scanUsersByTenantId(orgToSync[0].tenantId);
        await db
          .update(organizations)
          .set({ lastUserScan: new Date() })
          .where(eq(organizations.id, orgToSync[0].id));
        set.status = 200;
        return result;
      } catch (e) {
        set.status = 500;
        return e;
      }
    },
    { beforeHandle: [checkZeploSecretKey] }
  );
