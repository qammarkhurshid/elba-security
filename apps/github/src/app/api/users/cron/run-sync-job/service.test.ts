/* eslint-disable @typescript-eslint/no-non-null-assertion -- conveniency */
import { expect, test, describe, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { RequestError } from '@octokit/request-error';
import { Installation, ThirdPartyAppsSyncJob, UsersSyncJob, db } from '@/database';
import * as githubOrganization from '@/repositories/github/organization';
import { env } from '@/common/env';
import { runUsersSyncJobs } from './service';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  elbaOrganizationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));
const usersSyncJobs = [
  // this job should be picked
  {
    installationId: 1,
    priority: 1,
    syncStartedAt: new Date('2023-11-16T10:00:00.000Z'),
  },
  {
    installationId: 2,
    priority: 1,
    syncStartedAt: new Date('2023-11-16T11:00:00.000Z'),
  },
  {
    installationId: 3,
    priority: 2,
    syncStartedAt: new Date('2023-11-15T11:00:00.000Z'),
  },
];

const members = Array.from({ length: 20 }, (_, i) => ({
  id: `member-${i}`,
  login: `member-${i}-login`,
  role: (i < 2 ? 'ADMIN' : 'MEMBER') as 'ADMIN' | 'MEMBER',
  name: null,
  email: null,
}));

describe('runUsersSyncJobs', () => {
  test('should abort when there is no users_sync_jobs to run', async () => {
    await expect(runUsersSyncJobs()).resolves.toStrictEqual({
      message: 'There is no users_sync_job to run',
    });
  });

  test('should delay the job when github rate limit is reached', async () => {
    await db.insert(Installation).values(installations);
    await db.insert(UsersSyncJob).values(usersSyncJobs);
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

    await expect(runUsersSyncJobs()).resolves.toStrictEqual({
      success: false,
      id: 1,
    });
    await expect(
      db
        .select({ retryAfter: UsersSyncJob.retryAfter })
        .from(UsersSyncJob)
        .where(eq(UsersSyncJob.installationId, 1))
    ).resolves.toMatchObject([
      {
        retryAfter: new Date(Number(rateLimitReset) * 1000),
      },
    ]);
  });

  describe('when an unexpected error occurs', () => {
    test('should increment the job retry_count when it has not reach the max retry count', async () => {
      await db.insert(Installation).values(installations);
      await db.insert(UsersSyncJob).values(usersSyncJobs);
      vi.spyOn(githubOrganization, 'getPaginatedOrganizationMembers').mockRejectedValue(
        new Error('foo bar')
      );
      await expect(runUsersSyncJobs()).resolves.toStrictEqual({
        success: false,
        id: 1,
      });
      await expect(
        db
          .select({ retryCount: UsersSyncJob.retryCount })
          .from(UsersSyncJob)
          .where(eq(UsersSyncJob.installationId, 1))
      ).resolves.toMatchObject([
        {
          retryCount: 1,
        },
      ]);
    });

    test('should delete the job when it has reach the max retry count', async () => {
      await db.insert(Installation).values(installations);
      await db.insert(UsersSyncJob).values(
        usersSyncJobs.map((job) =>
          job.installationId === 1
            ? {
                ...job,
                retryCount: env.USERS_SYNC_MAX_RETRY,
              }
            : job
        )
      );

      await expect(runUsersSyncJobs()).resolves.toStrictEqual({
        success: false,
        id: 1,
      });

      await expect(
        db
          .select({ retryCount: UsersSyncJob.retryCount })
          .from(UsersSyncJob)
          .where(eq(UsersSyncJob.installationId, 1))
      ).resolves.toMatchObject([]);
    });
  });

  test.each([
    { priority: 1, usersSyncJobs, pickedUserSyncJob: usersSyncJobs[0]! },
    { priority: 2, usersSyncJobs: [usersSyncJobs[2]!], pickedUserSyncJob: usersSyncJobs[2]! },
  ])('should run then scan when picked job has priority $priority', async (params) => {
    const {
      priority,
      pickedUserSyncJob: { installationId },
    } = params;
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
    await db.insert(UsersSyncJob).values(params.usersSyncJobs);

    await expect(runUsersSyncJobs()).resolves.toStrictEqual({
      success: true,
      id: installationId,
    });

    // the job should be removed
    await expect(
      db
        .select({ retryCount: UsersSyncJob.retryCount })
        .from(UsersSyncJob)
        .where(eq(UsersSyncJob.installationId, installationId))
    ).resolves.toMatchObject([]);

    if (priority === 1) {
      await expect(
        db
          .select()
          .from(ThirdPartyAppsSyncJob)
          .where(eq(ThirdPartyAppsSyncJob.installationId, installationId))
      ).resolves.toHaveLength(1);
    }

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
  });
});
