import { Elba } from '@elba-security/sdk';
import { env } from '../env';

export const elbaAccess = (organisationId: string) => {
  return new Elba({
    apiKey: env.ELBA_API_KEY,
    baseUrl: env.ELBA_API_BASE_URL,
    organisationId,
    region: env.ELBA_REGION,
    sourceId: env.ELBA_SOURCE_ID,
  });
};
