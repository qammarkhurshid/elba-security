// import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
// import { RetryAfterError } from 'inngest';
// import { db, tokens } from '@/database';
// import { inngest, FunctionHandler } from '../../client';
// import { handler } from './service';
// import { insertTestAccessToken } from '@/common/mocks/token';
// import { DropboxResponseError } from 'dropbox';

// vi.mock('../../client', () => {
//   return {
//     inngest: {
//       createFunction: vi.fn(),
//       send: vi.fn(),
//     },
//   };
// });

// const mockFunction = <T>(functionHandler: FunctionHandler, data: T) => {
//   const step = {
//     run: vi
//       .fn()
//       .mockImplementation((name: string, stepHandler: () => Promise<unknown>) => stepHandler()),
//   };
//   const context = {
//     event: {
//       ts: new Date().getTime(),
//       data,
//     },
//     step,
//   };
//   return {
//     // @ts-expect-error -- this is a mock
//     result: functionHandler(context),
//     step,
//   };
// };

// const mocks = vi.hoisted(() => {
//   return {
//     teamMembersListV2: vi.fn(),
//     teamMembersListContinueV2: vi.fn(),
//   };
// });

// // Mock Dropbox sdk
// vi.mock('dropbox', () => {
//   const actual = vi.importActual('dropbox');
//   return {
//     ...actual,
//     DropboxAuth: vi.fn(() => {
//       return {
//         teamMembersListV2: mocks.teamMembersListV2,
//         teamMembersListContinueV2: mocks.teamMembersListContinueV2,
//       };
//     }),
//     Dropbox: vi.fn(() => {}),
//     DropboxResponseError: vi.fn(() => {}),
//   };
// });

// type SetupArgs = {
//   organisationId?: string;
//   accessToken?: string;
//   isFirstScan?: boolean;
// };

// const defaultData = {
//   organisationId: 'organisation-id-1',
//   accessToken: 'access-token-1',
//   isFirstScan: false,
// };

// const setup = (data: SetupArgs = defaultData) => {
//   const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });
//   const { result, step } = mockFunction(handler, data);
//   return [
//     result,
//     {
//       inngest: {
//         send,
//       },
//       step,
//     },
//   ] as const;
// };

// describe('run-user-sync-jobs', async () => {
//   beforeEach(async () => {
//     mocks.teamMembersListV2.mockReset();
//     mocks.teamMembersListContinueV2.mockReset();
//     await db.delete(tokens);
//   });

//   beforeAll(async () => {
//     vi.clearAllMocks();
//   });

//   test('should delay the job when Dropbox rate limit is reached', async () => {
//     await insertTestAccessToken();

//     mocks.teamMembersListV2.mockRejectedValueOnce(
//       new DropboxResponseError(
//         429,
//         {
//           'Retry-After': '5',
//         },
//         {
//           error_summary: 'too_many_requests/...',
//           error: {
//             '.tag': 'too_many_requests',
//           },
//         }
//       )
//     );

//     const [result, { inngest }] = setup({});

//     await expect(result).resolves.toBeUndefined();
//     expect(inngest.send).not.toHaveBeenCalled();
//   });
// });
