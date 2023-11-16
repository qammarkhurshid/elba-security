import { beforeEach } from 'vitest';
import {
  InstallationAdmin,
  Installation,
  ThirdPartyAppsSyncJob,
  UsersSyncJob,
  db,
} from '@/database';

beforeEach(async () => {
  await db.delete(InstallationAdmin);
  await db.delete(UsersSyncJob);
  await db.delete(ThirdPartyAppsSyncJob);
  await db.delete(Installation);
});
