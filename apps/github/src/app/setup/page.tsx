import { cookies } from 'next/headers';
import { RedirectType, redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect';
import { setupInstallation } from './service';

type SetupPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const rawInstallationId = searchParams?.installation_id;
  const installationId = Number(rawInstallationId);
  const organisationId = cookies().get('organisationId')?.value;

  if (Number.isNaN(installationId) || !rawInstallationId || typeof organisationId !== 'string') {
    // TODO - replace url by elba install error
    redirect('https://foo.bar?error=true', RedirectType.replace);
  }

  try {
    await setupInstallation(installationId, organisationId);
    // TODO - replace url by elba install success
    redirect('https://foo.bar', RedirectType.replace);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    // TODO - replace url by elba install error
    redirect('https://foo.bar?error=true', RedirectType.replace);
  }
}
