/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { getToken } from './auth';
import { NotionError } from './commons/error';

const validCode = '03d52066-734f-43cf-8cf4-304fdb3c4e75';
const invalidCode = '03d52066-734f-43cf-8cf4-304fdb3c4e71';

const token = { access_token: env.NOTION_CLIENT_SECRET, workspace_id: '0b71731f-04a8-4d78-9be0-6b28b09ab4e4' };

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.NOTION_API_BASE_URL}/v1/oauth/token`, async ({ request }) => {
          const data = (await request.json()) as { code: string };
          if (!data.code || data.code !== validCode) {
            return Response.json({ error_description: 'Could not Retrieve Token' }, { status: 401 });
          }
          return Response.json(token);
        })
      );
    });

    test('should return the token when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual(token);
    }, 10000);

    test('should throw when the code is invalid', async () => {
      await expect(getToken(invalidCode)).rejects.toThrowError(NotionError);
    }, 10000);
  });
});
