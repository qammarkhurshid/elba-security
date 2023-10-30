import {
  getAllUsersByTenantId,
  getTokenByTenantId,
  User,
} from 'src/common/microsoft';
import { checkOrganization } from 'src/common/utils';

const formatUserUpsertInput = (user: User) => ({
  id: user.id,
  email: user.mail || user.userPrincipalName,
  displayName: user.displayName,
  additionalEmails: user.otherMails,
});

export const scanUsersByTenantId = async (tenantId: string) => {
  await checkOrganization(tenantId);
  const { accessToken } = await getTokenByTenantId(tenantId);
  const users = await getAllUsersByTenantId({
    accessToken,
    tenantId,
  });
  const formattedUsers = users.map(formatUserUpsertInput);

  return formattedUsers;
};
