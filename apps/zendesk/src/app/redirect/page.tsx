'use client';
import { useEffect } from 'react';
import {useSearchParams } from 'next/navigation';
import { logger } from '@elba-security/logger';


const getCookie = (name: string): string =>{
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return (parts[parts.length - 1] || '').split(';').shift() || 'null';
    }
    return 'null';
}

const fetchAuthToken = async (code: string, orgId: string) =>{
      const response = await fetch(`/api/token?code=${code}&orgId=${orgId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json() as {access_token: string};
      return responseData;
    }

export default function RedirectPage() {
  const searchParams = useSearchParams();
  useEffect(() => {
  const fetchData = async () => {
    const code = searchParams.get('code');
    const orgId = getCookie('organisation_id');
    if (code && orgId) {
      try {
        await fetchAuthToken(code, orgId);
      } catch (error) {
        logger.error('Error fetching auth token:', {error});
        // redirect(`${process.env.ELBA_REDIRECT_URL}/error`, RedirectType.replace);
        window.location.assign(encodeURI(`/err`))
      }
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-floating-promises -- Need to find a way around it
  fetchData();
}, []);

    return (
    <div>
      <h3>REDIRECTION_PAGE</h3>
      <h3>CONFIRMATION_MESSAGE_FOR_SUCCESS</h3>
    </div>
  );
}


