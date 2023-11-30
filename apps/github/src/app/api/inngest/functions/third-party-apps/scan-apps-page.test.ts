/* eslint-disable camelcase -- test conveniency */
import { expect, test, describe, vi } from 'vitest';
import { RetryAfterError } from 'inngest';
import { RequestError } from '@octokit/request-error';
import * as githubOrganization from '@/repositories/github/organization';
import * as githubApp from '@/repositories/github/app';
import { createFunctionMock } from '../__mocks__/inngest';
import { scanAppsPage } from './scan-apps-page';

const githubInstallations = Array.from({ length: 5 }, (_, i) => ({
  id: 100 + i,
  created_at: new Date().toISOString(),
  app_slug: `app-${i}`,
  permissions: {
    foo: 'read' as const,
    baz: 'write' as const,
  },
  suspended_at: null,
}));

const githubApps = githubInstallations.map(({ id, app_slug }) => ({
  name: `app-name-${id}`,
  app_slug,
  description: `app-description-${id}`,
  html_url: `http//foo.bar/${id}`,
  owner: {
    name: `app-owner-${id}`,
  },
}));

const data = {
  installationId: 0,
  organisationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
  accountLogin: 'login-0',
  syncStartedAt: new Date().toISOString(),
  adminsIds: ['admin-0', 'admin-1'],
  isFirstScan: true,
  cursor: null,
};

const setup = createFunctionMock(scanAppsPage, 'third-party-apps/scan-page');

describe('scan-apps', () => {
  test('should delay the function when github rate limit is reached on installations retrieval', async () => {
    const rateLimitReset = '1700137003';
    vi.spyOn(githubOrganization, 'getPaginatedOrganizationInstallations').mockRejectedValue(
      new RequestError('foo bar', 429, {
        // @ts-expect-error this is a mock
        response: {
          headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': rateLimitReset },
        },
        request: { method: 'GET', url: 'http://foo.bar', headers: {} },
      })
    );

    const [result, { step }] = setup(data);

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Github rate limit reached', new Date(Number(rateLimitReset) * 1000))
    );

    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  test('should delay the function when github rate limit is reached on apps retrieval', async () => {
    const rateLimitReset = '1700137003';
    vi.spyOn(githubOrganization, 'getPaginatedOrganizationInstallations').mockResolvedValue({
      nextCursor: null,
      validInstallations: githubInstallations,
      invalidInstallations: [],
    });
    vi.spyOn(githubApp, 'getApp').mockRejectedValue(
      new RequestError('foo bar', 429, {
        // @ts-expect-error this is a mock
        response: {
          headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': rateLimitReset },
        },
        request: { method: 'GET', url: 'http://foo.bar', headers: {} },
      })
    );

    const [result, { step }] = setup(data);

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Github rate limit reached', new Date(Number(rateLimitReset) * 1000))
    );
    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  test('should scan apps page when there is another apps page', async () => {
    const nextCursor = '1234';
    vi.spyOn(githubOrganization, 'getPaginatedOrganizationInstallations').mockResolvedValue({
      nextCursor,
      validInstallations: githubInstallations,
      invalidInstallations: [],
    });
    vi.spyOn(githubApp, 'getApp').mockImplementation((_, appSlug) => {
      const app = githubApps.find((item) => item.app_slug === appSlug);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test conveniency
      return Promise.resolve(app!);
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('scan-apps-page', {
      name: 'third-party-apps/scan-page',
      data: {
        ...data,
        cursor: nextCursor,
      },
    });
  });

  test('should scan apps page and finalize scan when there is no other apps page', async () => {
    vi.spyOn(githubOrganization, 'getPaginatedOrganizationInstallations').mockResolvedValue({
      nextCursor: null,
      validInstallations: githubInstallations,
      invalidInstallations: [],
    });
    vi.spyOn(githubApp, 'getApp').mockImplementation((_, appSlug) => {
      const app = githubApps.find((item) => item.app_slug === appSlug);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test conveniency
      return Promise.resolve(app!);
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    expect(step.sendEvent).not.toBeCalled();
  });
});
