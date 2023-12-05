import { expect, test, describe, vi } from 'vitest';
import * as scanModules from '@/repositories/microsoft/users';
import { createFunctionMock } from '../functions/__mocks__/inngest';
import { scanUsers } from './scan-users';

const mockedOrganization = {
  id: 'id',
  tenantId: 'tenantId',
  organizationId: 'organizationId',
};

const setup = createFunctionMock(scanUsers);

describe('scan-users', () => {
  test('should scan users and send another event if there are more pages to scan', () => {
    const scanUsersMock = vi.spyOn(scanModules, 'scanUsersByTenantId').mockResolvedValue({
      formattedUsers: [],
      nextLink: 'nextLink',
    });
    const [_result, { step }] = setup();

    expect(scanUsersMock).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('scan-users', {
      name: 'users/scan',
      data: { ...mockedOrganization, syncStartedAt: new Date(), cursor: 'nextLink' },
    });
  });

  test('should scan users and not send another event if there are no more page to scan', () => {
    const scanUsersMock = vi.spyOn(scanModules, 'scanUsersByTenantId').mockResolvedValue({
      formattedUsers: [],
      nextLink: undefined,
    });
    const [_result, { step }] = setup();

    expect(scanUsersMock).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
