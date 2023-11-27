import { beforeEach } from 'vitest';
import { InstallationAdmin, Installation, db } from '@/database';

beforeEach(async () => {
  await db.delete(InstallationAdmin);
  await db.delete(Installation);
});
