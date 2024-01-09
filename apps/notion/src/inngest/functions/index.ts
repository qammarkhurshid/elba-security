import { syncUsers } from './users/sync-users';
import { scheduleSyncUsers } from './users/schedule-sync-users';

export const inngestFunctions = [syncUsers, scheduleSyncUsers];
