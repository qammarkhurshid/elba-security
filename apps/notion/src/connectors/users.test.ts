/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { type NotionUser, getUsers } from './users';
import { NotionError } from './commons/error';

const validToken = env.NOTION_CLIENT_SECRET;
const invalidToken = 'not_a_valid_token';

const maxPage = 0;

const users: NotionUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `username-${i}`,
  person: {
    email: `user-${i}@foo.bar`,
  },
  type: 'user',
  object: 'user',
}));

describe('auth connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.NOTION_API_BASE_URL}/v1/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const pageParam = url.searchParams.get('page_size');
          const page = pageParam ? Number(pageParam) : 0;
          if (page === maxPage) {
            return Response.json({ users, nextPage: null, });
          }
          return Response.json({ users, nextPage: 'next_cursor', });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers(validToken, '10')).resolves.toStrictEqual({
        users,
        nextPage: 'next_cursor',
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers(validToken, '0')).resolves.toStrictEqual({
        users,
        nextPage: 'next_cursor',
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers(invalidToken, '10')).rejects.toBeInstanceOf(NotionError);
    });
  });
});
