import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';
import { getSlackInstallationUrl } from '@/repositories/slack/oauth';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');

  if (!organisationId) {
    // TODO - replace url by elba install error
    redirect('https://foo.bar?error=true');
  }

  const state = crypto.randomUUID();
  const slackInstallationUrl = getSlackInstallationUrl(state);

  cookies().set('state', state);
  cookies().set('organisationId', organisationId);
  redirect(slackInstallationUrl);
}
