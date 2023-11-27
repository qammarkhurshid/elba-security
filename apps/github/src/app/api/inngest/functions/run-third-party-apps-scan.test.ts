import { expect, test, describe, vi } from 'vitest';
import { Installation, InstallationAdmin, db } from '@/database';
import * as githubOrganization from '@/repositories/github/organization';
import * as githubApp from '@/repositories/github/app';
import { runThirdPartyAppsScan } from './run-third-party-apps-scan';
import { mockFunction } from './__mocks__/inngest';

const installationIds = Array.from({ length: 5 }, (_, i) => i);
const installations = installationIds.map((id) => ({
  id,
  elbaOrganizationId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  accountId: 10 + id,
  accountLogin: `login-${id}`,
}));

const installationAdmins = Array.from({ length: 5 }, (_, i) => ({
  installationId: 0,
  adminId: `admin-id-${i}`,
  lastSyncAt: new Date(),
}));

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

const githubApps = githubInstallations.map(({ id }) => ({
  name: `app-name-${id}`,
  description: `app-description-${id}`,
  html_url: `http//foo.bar/${id}`,
  owner: {
    name: `app-owner-${id}`,
  },
}));

// draft
describe('run-user-scan', () => {
  test('should delay the job when github rate limit is reached', async () => {
    await db.insert(Installation).values(installations);
    await db.insert(InstallationAdmin).values(installationAdmins);
    vi.spyOn(githubOrganization, 'getPaginatedOrganizationInstallations').mockResolvedValue({
      validInstallations: githubInstallations,
      invalidInstallations: [],
      nextCursor: null,
    });
    // @ts-expect-error -- this is a mock
    const getApp = vi.spyOn(githubApp, 'getApp').mockImplementation(() => {
      return githubApps.at(getApp.mock.calls.length - 1);
    });

    const { result, step } = mockFunction(runThirdPartyAppsScan, {
      installationId: 0,
      isFirstScan: false,
    });

    await expect(result).resolves.toStrictEqual({
      installationId: 0,
    });
    expect(step.sendEvent).not.toHaveBeenCalled();
  });
});
