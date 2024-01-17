import { inngest } from '@/common/clients/inngest';
import { DeleteObjectPermissions } from '@/repositories/dropbox/types/types';

export const deleteObjectPermissions = async (permissions: DeleteObjectPermissions) => {
  await inngest.send({
    name: 'data-protection/delete-object-permissions',
    data: permissions,
  });

  return {
    success: true,
  };
};
