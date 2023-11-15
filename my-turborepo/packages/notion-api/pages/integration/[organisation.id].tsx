// pages/integration/[organisation_id].tsx
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import axios from 'axios';

const IntegrationPage = () => {
  const router = useRouter();
  const { organisation_id } = router.query;

  const handleNotionAuth = async () => {
    try {
      await signIn('notion', { redirect: false });
    } catch (error) {
      // Handle authentication error
    }
  };

  const handleManualInput = () => {
    // Implement manual input logic or redirect to manual input page
  };

  const handleTokenStorage = async () => {
    try {
      // Fetch the JWT token from the session
      const { data } = await axios.get('/api/manual-input');

      // Store the token in the database
      await axios.post('/api/store-token', {
        organisationId: organisation_id,
        notionToken: data.token,
        notionId: data.id,
      });

      // Redirect to the dashboard or perform other actions
    } catch (error) {
      // Handle error
    }
  };

  return (
    <div>
      <h1>Integration Page</h1>
      <button onClick={handleNotionAuth}>Authenticate with Notion</button>
      <button onClick={handleManualInput}>Manual Input</button>
      <button onClick={handleTokenStorage}>Store Token</button>
    </div>
  );
};

export default IntegrationPage;
