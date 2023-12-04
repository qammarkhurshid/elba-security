import { cookies } from 'next/headers';
import { RedirectType, redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { env } from '@/env';
import { setupInstallation } from './service';

type SetupPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const rawInstallationId = searchParams?.installation_id;
  const installationId = Number(rawInstallationId);
  const organisationId = cookies().get('organisationId')?.value;

  if (Number.isNaN(installationId) || !rawInstallationId || typeof organisationId !== 'string') {
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }

  try {
    await setupInstallation(installationId, organisationId);
    redirect(env.ELBA_REDIRECT_URL, RedirectType.replace);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirect(`${env.ELBA_REDIRECT_URL}?error=true`, RedirectType.replace);
  }
}
