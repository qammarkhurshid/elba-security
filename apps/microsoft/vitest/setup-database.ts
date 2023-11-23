import { beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { organizations } from '@/schemas/organization';
import { permissionGrants } from '@/schemas/permission-grant';
import { syncJobs } from '@/schemas/sync-job';

beforeEach(async () => {
  await db.delete(organizations);
  await db.delete(permissionGrants);
  await db.delete(syncJobs);
});
