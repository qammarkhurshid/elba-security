import { expect, test, describe, vi } from 'vitest';
import * as scanModules from '@/repositories/microsoft/tpa';
import { createFunctionMock } from '../functions/__mocks__/inngest';
import { scanThirdPartyApps } from './scan-third-party-apps';

const mockedOrganization = {
  id: 'id',
  tenantId: 'tenantId',
  organizationId: 'organizationId',
};

const setup = createFunctionMock(scanThirdPartyApps);

describe('scan-users', () => {
  test('should scan third party apps and send another event if there are more pages to scan', () => {
    const scanThirdPartyAppsMock = vi
      .spyOn(scanModules, 'scanThirdPartyAppsByTenantId')
      .mockResolvedValue({
        permissionGrantsObjects: [],
        thirdPartyAppsObjects: { apps: [] },
        pageLink: 'pageLink',
      });
    const [_result, { step }] = setup();

    expect(scanThirdPartyAppsMock).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('scan-third-party-apps', {
      name: 'third-party-apps/scan',
      data: { ...mockedOrganization, syncStartedAt: new Date(), cursor: 'nextLink' },
    });
  });

  test('should scan users and not send another event if there are no more page to scan', () => {
    const scanThirdPartyAppsMock = vi
      .spyOn(scanModules, 'scanThirdPartyAppsByTenantId')
      .mockResolvedValue({
        permissionGrantsObjects: [],
        thirdPartyAppsObjects: { apps: [] },
        pageLink: undefined,
      });
    const [_result, { step }] = setup();

    expect(scanThirdPartyAppsMock).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
