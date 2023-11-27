import { expect, test, describe, vi } from 'vitest';
import { RequestError } from '@octokit/request-error';
import { RetryAfterError } from 'inngest';
import { Installation, db } from '@/database';
import * as githubOrganization from '@/repositories/github/organization';
import { runUsersScan } from './run-users-scan';
import { mockFunction } from './__mocks__/inngest';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  elbaOrganizationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));

const members = Array.from({ length: 20 }, (_, i) => ({
  id: `member-${i}`,
  login: `member-${i}-login`,
  role: (i < 2 ? 'ADMIN' : 'MEMBER') as 'ADMIN' | 'MEMBER',
  name: null,
  email: null,
}));

describe('run-user-scan', () => {
  test('should delay the job when github rate limit is reached', async () => {
    await db.insert(Installation).values(installations);
    const rateLimitReset = '1700137003';
    vi.spyOn(githubOrganization, 'getPaginatedOrganizationMembers').mockRejectedValue(
      new RequestError('foo bar', 429, {
        // @ts-expect-error this is a mock
        response: {
          headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': rateLimitReset },
        },
        request: { method: 'GET', url: 'http://foo.bar', headers: {} },
      })
    );

    const { result, step } = mockFunction(runUsersScan, { installationId: 0, isFirstScan: false });

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Github rate limit reached', new Date(Number(rateLimitReset) * 1000))
    );
    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  test('should scan users and send a tpa scan event when it is the first scan', async () => {
    const firstPageCursor = 'first-page-cursor';

    const getPaginatedOrganizationMembers = vi
      .spyOn(githubOrganization, 'getPaginatedOrganizationMembers')
      .mockImplementation(() => {
        const callCount = getPaginatedOrganizationMembers.mock.calls.length;
        if (callCount === 1) {
          return Promise.resolve({
            nextCursor: firstPageCursor,
            validMembers: members.slice(0, 10),
            invalidMembers: [],
          });
        }
        return Promise.resolve({
          nextCursor: null,
          validMembers: members.slice(0, 20),
          invalidMembers: [],
        });
      });

    await db.insert(Installation).values(installations);

    const installationId = 1;
    const { result, step } = mockFunction(runUsersScan, { installationId, isFirstScan: true });

    await expect(result).resolves.toStrictEqual({
      installationId,
    });

    expect(getPaginatedOrganizationMembers).toBeCalledTimes(2);
    expect(getPaginatedOrganizationMembers).toHaveBeenNthCalledWith(
      1,
      installationId,
      `login-${installationId}`,
      null
    );
    expect(getPaginatedOrganizationMembers).toHaveBeenNthCalledWith(
      2,
      installationId,
      `login-${installationId}`,
      firstPageCursor
    );

    expect(step.sendEvent).toBeCalledWith('run-third-party-apps-scan', {
      name: 'third-party-apps/scan',
      data: { installationId, isFirstScan: true },
    });
  });
});
