import { beforeEach } from 'vitest';
import { db, Organisation } from '@/database';

beforeEach(async () => {
  await db.delete(Organisation);
});
