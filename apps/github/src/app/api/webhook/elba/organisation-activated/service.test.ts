import { expect, test, describe, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { Installation, Organisation, db } from '@/database';
import * as client from '../../../inngest/client';
import { handleElbaOrganisationActivated } from './service';

const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';
const installation = {
  id: 0,
  organisationId,
  accountId: 10,
  accountLogin: 'login-0',
};

describe('handleElbaOrganisationActivated', () => {
  test('should throws when organisation is not registered', async () => {
    await expect(handleElbaOrganisationActivated(organisationId)).rejects.toStrictEqual(
      new Error(`Could not retrieve an organisation with id=${organisationId}`)
    );
  });

  test('should throws when organisation does not have an installation', async () => {
    await db.insert(Organisation).values({ id: organisationId, isActivated: false });
    await expect(handleElbaOrganisationActivated(organisationId)).rejects.toStrictEqual(
      new Error(`Could not retrieve an installation with organisationId=${organisationId}`)
    );
  });

  test('should not schedule apps scan when the organisation is already activated', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });
    await db.insert(Organisation).values({ id: organisationId, isActivated: true });
    await db.insert(Installation).values(installation);

    await expect(handleElbaOrganisationActivated(organisationId)).resolves.toStrictEqual({
      success: false,
      message: 'Organisation is already activated',
    });
    expect(send).toBeCalledTimes(0);
    await expect(
      db
        .select({ isActivated: Organisation.isActivated })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId))
    ).resolves.toMatchObject([{ isActivated: true }]);
  });

  test('should schedule apps scan and activate organisation when the organisation is not activated and have an installation', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });
    await db.insert(Organisation).values({ id: organisationId, isActivated: false });
    await db.insert(Installation).values(installation);

    await expect(handleElbaOrganisationActivated(organisationId)).resolves.toStrictEqual({
      success: true,
    });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'third-party-apps/scan',
      data: {
        installationId: 0,
        isFirstScan: true,
      },
    });
    await expect(
      db
        .select({ isActivated: Organisation.isActivated })
        .from(Organisation)
        .where(eq(Organisation.id, organisationId))
    ).resolves.toMatchObject([{ isActivated: true }]);
  });
});
