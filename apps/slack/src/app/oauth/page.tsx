import { cookies } from 'next/headers';
import { RedirectType, redirect } from 'next/navigation';
import { handleSlackInstallation } from './service';

export const runtime = 'edge';

type SetupPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const state = searchParams?.state;
  const code = searchParams?.code;
  const cookieState = cookies().get('state')?.value;
  const organisationId = cookies().get('organisationId')?.value;

  console.log({
    state,
    cookieState,
    code,
    organisationId,
  });

  // TODO: Check search params
  // error=access_denied&state=&error_description=The+user+has+denied+access+to+the+scope%28s%29+requested+by+the+client+application.
  if (
    !state ||
    state !== cookieState ||
    typeof code !== 'string' ||
    typeof organisationId !== 'string'
  ) {
    // TODO - replace url by elba install error
    redirect('https://foo.bar?error=true', RedirectType.replace);
  }

  try {
    await handleSlackInstallation({ organisationId, code });
  } catch (error) {
    console.error(error);
    redirect('https://foo.bar?error=true', RedirectType.replace);
  }

  redirect('https://foo.bar', RedirectType.replace);
}
