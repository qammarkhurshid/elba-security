import { expect, test, describe, vi, beforeEach } from 'vitest';
import { RetryAfterError } from 'inngest';
import { RequestError } from '@octokit/request-error';
import * as githubOrganization from '@/repositories/github/organization';
import { Installation, InstallationAdmin, Organisation } from '@/database/schema';
import { db } from '@/database/client';
import { createFunctionMock } from '../__mocks__/inngest';
import { scanUsersPage } from './scan-users-page';

const githubMembers = Array.from({ length: 5 }, (_, i) => ({
  id: `${100 + i}`,
  role: 'MEMBER' as const,
  login: `member-${i}`,
  name: `member ${i}`,
  email: `member-${i}@foo.bar`,
}));

const githubAdmins = Array.from({ length: 5 }, (_, i) => ({
  id: `${1000 + i}`,
  role: 'ADMIN' as const,
  login: `admin-${i}`,
  name: `admin ${i}`,
  email: `admin-${i}@foo.bar`,
}));

const githubUsers = [...githubAdmins, ...githubMembers];

const data = {
  installationId: 0,
  organisationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
  accountLogin: 'login-0',
  syncStartedAt: new Date().toISOString(),
  isFirstScan: true,
  cursor: null,
};

const setup = createFunctionMock(scanUsersPage, 'users/scan-page');

describe('scan-users-page', () => {
  beforeEach(async () => {
    await db.insert(Organisation).values({ id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90' });
    await db.insert(Installation).values({
      id: 0,
      organisationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c90`,
      accountId: 10,
      accountLogin: `login-0`,
    });
  });

  test('should delay the function when github rate limit is reached on users retrieval', async () => {
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

    const [result, { step }] = setup(data);

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Github rate limit reached', new Date(Number(rateLimitReset) * 1000))
    );
    await expect(
      db.select({ adminId: InstallationAdmin.adminId }).from(InstallationAdmin)
    ).resolves.toHaveLength(0);

    expect(step.sendEvent).not.toHaveBeenCalled();
  });

  test('should scan users page when there is another apps page', async () => {
    const nextCursor = '1234';
    vi.spyOn(githubOrganization, 'getPaginatedOrganizationMembers').mockResolvedValue({
      nextCursor,
      validMembers: githubUsers,
      invalidMembers: [],
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    await expect(
      db.select({ adminId: InstallationAdmin.adminId }).from(InstallationAdmin)
    ).resolves.toMatchObject(githubAdmins.map(({ id }) => ({ adminId: id })));
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('scan-users-page', {
      name: 'users/scan-page',
      data: {
        ...data,
        cursor: nextCursor,
      },
    });
  });

  test('should scan users page and finalize when there is no other users page', async () => {
    vi.spyOn(githubOrganization, 'getPaginatedOrganizationMembers').mockResolvedValue({
      nextCursor: null,
      validMembers: githubUsers,
      invalidMembers: [],
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    await expect(
      db.select({ adminId: InstallationAdmin.adminId }).from(InstallationAdmin)
    ).resolves.toMatchObject(githubAdmins.map(({ id }) => ({ adminId: id })));
    expect(step.sendEvent).not.toBeCalled();
  });
});
