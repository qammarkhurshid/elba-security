'use client';
import { useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import React, { useEffect } from 'react';

export default function Home() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get('organisation_id');

  useEffect(() => {
    if (organisationId) {
      Cookies.set('organisationId', organisationId);
    }
  }, [organisationId]);

  if (!organisationId) {
    // TODO: error page with link to redirect to elba
    return <span>some error</span>;
  }

  return <a href="https://github.com/apps/local-elba/installations/new">connect elba to Github</a>;
}
