// import { expect, test, describe, vi, beforeAll, beforeEach } from 'vitest';
// import { GET as handler } from './route';
// import { tokens, db } from '@/database';
// import { RequestMethod, createMocks } from 'node-mocks-http';
// import { addMinutes } from 'date-fns';
// import timekeeper from 'timekeeper';

// import { insertTestAccessToken } from '@/common/mocks/token';

// const TOKEN_GENERATED_AT = '2023-03-13T16:19:20.818Z';
// const TOKEN_WILL_EXPIRE_IN = 240; // minutes
// const TOKEN_EXPIRES_AT = addMinutes(new Date(TOKEN_GENERATED_AT), TOKEN_WILL_EXPIRE_IN);

// const organisationWithExpiredToken = [
//   {
//     organisationId: 'b0771747-caf0-487d-a885-5bc3f1e9f770',
//     expiresAt: '2023-03-13T16:19:20.818Z',
//   },
//   {
//     organisationId: '97db2aef-7d09-412e-90d4-204829df6c9f',
//     expiresAt: '2023-03-13T16:19:20.818Z',
//   },
//   {
//     organisationId: '3a3a4485-fd9f-4687-919b-869faae93e58',
//     expiresAt: '2023-03-13T16:19:20.818Z',
//   },
//   {
//     organisationId: 'e3090d62-8701-45cf-85ad-c7c7496a2e85',
//     expiresAt: '2023-03-13T16:19:20.818Z',
//     isUnauthorized: false,
//   },
//   {
//     organisationId: '61dd3cac-203f-4856-ba90-3b4ca0ce7348',
//     expiresAt: '2023-03-13T16:19:20.818Z',
//     refreshAfter: '2023-03-13T20:00:20.818Z', // Try after current data
//   },
//   {
//     organisationId: '1aca1413-79b3-454b-968f-d94e215b9ec9',
//     expiresAt: '2023-03-13T16:19:20.818Z',
//     isUnauthorized: true,
//   },
// ];

// const mocks = vi.hoisted(() => {
//   return {
//     getAccessToken: vi.fn(),
//     getAccessTokenExpiresAt: vi.fn(),
//     refreshAccessToken: vi.fn(),
//   };
// });

// // Mock Dropbox sdk
// vi.mock('dropbox', () => {
//   const actual = vi.importActual('dropbox');
//   return {
//     ...actual,
//     DropboxAuth: vi.fn(() => {
//       return {
//         getAccessToken: mocks.getAccessToken,
//         getAccessTokenExpiresAt: mocks.getAccessTokenExpiresAt,
//         refreshAccessToken: mocks.refreshAccessToken,
//       };
//     }),
//     Dropbox: vi.fn(() => {}),
//     DropboxResponseError: vi.fn(() => {}),
//   };
// });

// const mockRequestResponse = (method: RequestMethod = 'GET') => {
//   const { req, res } = createMocks({
//     method,
//   });
//   return { req, res };
// };

// describe('Callback dropbox', () => {
//   beforeEach(async () => {
//     mocks.getAccessToken.mockReset();
//     mocks.getAccessTokenExpiresAt.mockReset();
//     mocks.refreshAccessToken.mockReset();
//     await db.delete(tokens);
//   });

//   beforeAll(async () => {
//     timekeeper.freeze(TOKEN_GENERATED_AT);
//     vi.clearAllMocks();
//   });

//   test('should not refresh tokens when there is no token to refresh', async () => {
//     const { req } = mockRequestResponse();
//     const response = await handler(req);
//     expect(response.status).toBe(200);
//     expect(await response.json()).toEqual({
//       data: {
//         failedOrganisationIds: [],
//         refreshedOrganisationIds: [],
//       },
//       message: 'No organisations found to refresh',
//       success: true,
//     });
//   });

//   test.only('should refresh tokens for the available organisation', async () => {
//     mocks.getAccessToken
//       .mockReturnValueOnce(`test-new-access-token-1`)
//       .mockReturnValueOnce(`test-new-access-token-2`)
//       .mockReturnValueOnce(`test-new-access-token-3`)
//       .mockReturnValue('test-new-access-token-4');

//     mocks.getAccessTokenExpiresAt
//       .mockReturnValueOnce(TOKEN_EXPIRES_AT)
//       .mockReturnValueOnce(TOKEN_EXPIRES_AT)
//       .mockReturnValue(TOKEN_EXPIRES_AT);

//     const tokenDetails = organisationWithExpiredToken.map(
//       ({ organisationId, expiresAt, isUnauthorized, refreshAfter }, index) => {
//         return insertTestAccessToken({
//           organisationId,
//           accessToken: `test-access-token-${index}`,
//           refreshToken: `test-refresh-token-${index}`,
//           expiresAt,
//           adminTeamMemberId: `test-team-member-id-${index}`,
//           rootNamespaceId: `root-name-space-id-${index}`,
//           teamName: 'test-team-name',
//           ...(isUnauthorized && {
//             unauthorizedAt: new Date(Date.now()).toISOString(),
//           }),
//           ...(refreshAfter && {
//             refreshAfter,
//           }),
//         });
//       }
//     );

//     await Promise.all(tokenDetails);

//     const { req } = mockRequestResponse();
//     const response = await handler(req);

//     expect(response.status).toBe(200);
//     expect(await response.json()).toEqual({
//       data: {
//         failedOrganisationIds: [],
//         refreshedOrganisationIds: expect.arrayContaining([
//           'b0771747-caf0-487d-a885-5bc3f1e9f770',
//           '3a3a4485-fd9f-4687-919b-869faae93e58',
//           '97db2aef-7d09-412e-90d4-204829df6c9f',
//           'e3090d62-8701-45cf-85ad-c7c7496a2e85',
//         ]),
//       },
//       message: 'Organisations refreshed',
//       success: true,
//     });
//   });
// });
