import { expect, test, describe, vi } from 'vitest';
import * as microsoftModules from '@/common/microsoft';
import * as utilsModules from '@/common/utils';
import { handleMicrosoftAuthCallback } from './auth';

const tenantId = 'tenantId';

describe('auth.ts', () => {
  describe('handleMicrosoftAuthCallback', () => {
    test('should return error if admin consent is not given', async () => {
      vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
        accessToken: 'accessToken',
        scopes: [],
      });
      const result = await handleMicrosoftAuthCallback({
        tenantId,
        isAdminConsentGiven: false,
      });
      expect(result).toEqual('You must give admin consent to continue');
    });

    test('should return error if tenant is null', async () => {
      vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
        accessToken: 'accessToken',
        scopes: [],
      });
      const result = await handleMicrosoftAuthCallback({
        tenantId: null,
        isAdminConsentGiven: true,
      });
      expect(result).toEqual('You must give admin consent to continue');
    });

    test('should throw error if scopes are missing', async () => {
      vi.spyOn(utilsModules, 'timeout').mockResolvedValue({});
      vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
        accessToken: 'accessToken',
        scopes: [],
      });
      await expect(
        handleMicrosoftAuthCallback({ tenantId, isAdminConsentGiven: true })
      ).rejects.toThrow("Couldn't retrieve required scopes");
    });

    test('should return success message if admin consent is given', async () => {
      vi.spyOn(utilsModules, 'timeout').mockResolvedValue({});
      vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
        accessToken: 'accessToken',
        scopes: [
          'DelegatedPermissionGrant.ReadWrite.All',
          'Application.ReadWrite.All',
          'User.Read.All',
        ],
      });

      await expect(
        handleMicrosoftAuthCallback({ tenantId, isAdminConsentGiven: true })
      ).resolves.toEqual(
        'You have successfully given admin consent. You may close this window now.'
      );
    });
  });
});
