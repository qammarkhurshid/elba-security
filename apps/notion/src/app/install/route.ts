import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

export const runtime = 'edge';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');

  if (!organisationId) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`);
  }

  const redirectUrl = new URL(`${env.NOTION_API_BASE_URL}/v1/oauth/authorize`);
  redirectUrl.searchParams.append('client_id', env.NOTION_CLIENT_ID);
  redirectUrl.searchParams.append('response_type', 'code');
  redirectUrl.searchParams.append('owner', 'user');
  redirectUrl.searchParams.append('redirect_uri', env.NOTION_REDIRECT_URL);
  redirectUrl.searchParams.append('state', organisationId);

  cookies().set('organisation_id', organisationId);

  return NextResponse.redirect(redirectUrl.toString());
};
