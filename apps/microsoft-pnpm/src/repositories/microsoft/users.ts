import { checkOrganization } from '@/common/utils';
import { getPaginatedUsersByTenantId, getTokenByTenantId } from '@/common/microsoft';
import { User } from '@/common/microsoft';

const formatUserUpsertInput = (user: User) => ({
  id: user.id,
  email: user.mail || user.userPrincipalName,
  displayName: user.displayName,
  additionalEmails: user.otherMails,
});

export const scanUsersByTenantId = async (tenantId: string, pageLink: string | null) => {
  await checkOrganization(tenantId);
  const { accessToken } = await getTokenByTenantId(tenantId);
  const users = await getPaginatedUsersByTenantId({
    accessToken,
    tenantId,
    pageLink,
  });
  const formattedUsers = users.map(formatUserUpsertInput);

  return formattedUsers;
};
