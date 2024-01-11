import { beforeEach } from 'node:test';
import { describe, expect, test } from 'vitest';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';

import { unauthorizedMiddleware } from './unauthorized-middleware';
import { insertOrganisations } from '@/common/__mocks__/token';
import { DropboxResponseError } from 'dropbox';
import { env } from '@/common/env';
import { tokens } from '@/database';

const organisationId = '00000000-0000-0000-0000-000000000000';

const organisation = {
  id: '00000000-0000-0000-0000-000000000000',
  region: 'us',
  installationId: 0,
  accountLogin: 'some-login',
};

describe('unauthorized middleware', () => {
  beforeEach(async () => {
    await await insertOrganisations({
      size: 1,
    });
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

  test('should not transform the output when the error is not about Dropbox authorization', async () => {
    const generalError = new DropboxResponseError(
      403,
      {},
      {
        error_summary: 'other/...',
        error: {
          '.tag': 'other',
        },
      }
    );

    await expect(
      unauthorizedMiddleware
        .init()
        // @ts-expect-error -- this is a mock
        .onFunctionRun({ fn: { name: 'foo' }, ctx: { event: { data: {} } } })
        .transformOutput({
          result: {
            error: generalError,
          },
        })
    ).resolves.toBeUndefined();
  });

  test('should transform the output error to NonRetriableError and remove the organisation when the error is about github authorization', async () => {
    const elba = spyOnElba();
    const unauthorizedError = new DropboxResponseError(
      401,
      {},
      {
        error_summary: 'invalid_access_token/...',
        error: {
          '.tag': 'invalid_access_token',
        },
      }
    );

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
      .onFunctionRun({
        // @ts-expect-error -- this is a mock
        fn: { name: 'foo' },
        // @ts-expect-error -- this is a mock
        ctx: { event: { data: { organisationId } } },
      })
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

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: env.ELBA_REGION,
      sourceId: env.ELBA_SOURCE_ID,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      hasError: true,
    });
    await expect(
      db.select().from(tokens).where(eq(tokens.organisationId, organisationId))
    ).resolves.toHaveLength(0);
  });
});
