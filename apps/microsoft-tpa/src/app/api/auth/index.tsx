import { Layout } from 'src/components/Layout';
import MicrosoftLoginButton from 'src/components/MicrosoftButton';
import { handleMicrosoftAuthCallback } from 'src/microsoft/auth';
import { createElysia } from 'src/util/elysia';

export const routes = createElysia({ prefix: '/auth' })
  .get('/', async (ctx) => {
    return (
      <Layout>
        <MicrosoftLoginButton />
      </Layout>
    );
  })
  .get('/callback', async ({ query, set }) => {
    const isAdminConsentGiven = query['admin_consent'] === 'True';
    const tenantId = query['tenant'] as string | undefined;
    const result = await handleMicrosoftAuthCallback({
      tenantId,
      isAdminConsentGiven,
    });
    set.status = 200;
    return result;
  });
