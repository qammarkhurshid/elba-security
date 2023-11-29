import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const organisationId = request.nextUrl.searchParams.get('organisation_id');

  if (!organisationId) {
    // TODO - replace url by elba install error
    redirect('https://foo.bar?error=true');
  }

  cookies().set('organisationId', organisationId);
  redirect('https://github.com/apps/local-elba/installations/new');
}
