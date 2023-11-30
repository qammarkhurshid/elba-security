import type { SafeMicrosoftGraphUser } from '@/common/microsoft';
import { getPaginatedUsersByTenantId } from '@/common/microsoft';
import type { User } from '../elba/resources/users/types';

const formatUserUpsertInput = (user: SafeMicrosoftGraphUser): User => {
  return {
    id: user.id,
    email: user.mail || user.userPrincipalName || undefined,
    displayName: user.displayName,
    additionalEmails: user.otherMails,
  };
};

export const scanUsersByTenantId = async ({
  accessToken,
  tenantId,
  pageLink,
}: {
  accessToken: string;
  tenantId: string;
  pageLink: string | undefined;
}) => {
  const response = await getPaginatedUsersByTenantId({
    accessToken,
    tenantId,
    pageLink,
  });
  const formattedUsers = response.value.map(formatUserUpsertInput);

  return { formattedUsers, nextLink: response['@odata.nextLink'] };
};
