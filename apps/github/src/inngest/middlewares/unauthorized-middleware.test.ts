import { beforeEach } from 'node:test';
import { describe, expect, test } from 'vitest';
import { RequestError } from '@octokit/request-error';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { spyOnElbaSdk } from '@/__mocks__/elba-sdk';
import { unauthorizedMiddleware } from './unauthorized-middleware';

const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  installationId: 0,
  accountLogin: 'some-login',
};

describe('unauthorized middleware', () => {
  beforeEach(async () => {
    await db.insert(Organisation).values(organisation);
  });

  test('should not transform the output when their is no error', async () => {
    await expect(
      unauthorizedMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
        .transformOutput({
          result: {},
        })
    ).resolves.toBeUndefined();
  });

  test('should not transform the output when the error is not about github authorization', async () => {
    await expect(
      unauthorizedMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
        .transformOutput({
          result: {
            error: new Error('foo bar'),
          },
        })
    ).resolves.toBeUndefined();
  });

  test('should transform the output error to NonRetriableError and remove the organisation when the error is about github authorization', async () => {
    const elba = spyOnElbaSdk();
    const unauthorizedError = new RequestError('foo bar', 401, {
      request: { method: 'GET', url: 'http://foo.bar', headers: {} },
      // @ts-expect-error this is a mock
      response: {
        status: 401,
      },
    });

    const context = {
      foo: 'bar',
      baz: {
        biz: true,
      },
      result: {
        data: 'bizz',
        error: unauthorizedError,
      },
    };

    const result = await unauthorizedMiddleware
      .init()
      // @ts-expect-error -- this is a mock
      .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: { organisationId } } } })
      .transformOutput(context);
    expect(result?.result.error).toBeInstanceOf(NonRetriableError);
    expect(result?.result.error.cause).toStrictEqual(unauthorizedError);
    expect(result).toMatchObject({
      foo: 'bar',
      baz: {
        biz: true,
      },
      result: {
        data: 'bizz',
      },
    });

    expect(elba.connectionStatus.update).toBeCalledTimes(1);
    expect(elba.connectionStatus.update).toBeCalledWith({
      hasError: true,
    });
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisationId))
    ).resolves.toHaveLength(0);
  });
});
