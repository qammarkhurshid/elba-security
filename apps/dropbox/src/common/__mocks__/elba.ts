import { vi } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    updateUsers: vi.fn(),
    deleteUsers: vi.fn(),
    updateDataProtectionObjects: vi.fn(),
    deleteDataProtectionObjects: vi.fn(),
  };
});

vi.mock('@elba-security/sdk', () => {
  const actual = vi.importActual('@elba-security/sdk');
  return {
    ...actual,
    Elba: vi.fn(() => {
      return {
        users: {
          update: mocks.updateUsers,
          delete: mocks.deleteUsers,
        },
        dataProtection: {
          updateObjects: mocks.updateDataProtectionObjects,
          deleteObjects: mocks.deleteDataProtectionObjects,
        },
      };
    }),
  };
});

export default mocks;
