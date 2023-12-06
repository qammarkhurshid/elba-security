import { RedirectType, redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { setupOrganisation } from './service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rawInstallationId = request.nextUrl.searchParams.get('installation_id');
  const organisationId = request.cookies.get('organisation_id')?.value;
  const installationId = Number(rawInstallationId);

  if (Number.isNaN(installationId) || rawInstallationId === null || !organisationId) {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }

  try {
    await setupOrganisation(installationId, organisationId);
    redirect(env.ELBA_REDIRECT_URL, RedirectType.replace);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    // eslint-disable-next-line no-console -- temporary
    console.log(error);
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }
}
