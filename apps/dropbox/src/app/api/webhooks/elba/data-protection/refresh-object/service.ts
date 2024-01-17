import { inngest } from '@/common/clients/inngest';

export const deleteObjectPermissions = async (props) => {
  await inngest.send({
    name: 'data-protection/refresh-object',
    data: props,
  });

  return {
    success: true,
  };
};
