import { RedirectType } from 'next/navigation';
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const cookieStore = cookies();
  const organisationId = cookieStore.get('organisation_id')?.value;

  if (!organisationId || !code) {
    return NextResponse.redirect(`${env.ELBA_REDIRECT_URL}?source=${env.ELBA_SOURCE_ID}&error=true`, RedirectType.replace);
  }

  await setupOrganisation(organisationId, code);

  return NextResponse.redirect(`${env.ELBA_REDIRECT_URL}?source=${env.ELBA_SOURCE_ID}&success=true`, RedirectType.replace);
};
