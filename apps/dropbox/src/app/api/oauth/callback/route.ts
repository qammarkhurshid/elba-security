import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken } from './service';
import { env } from '@/common/env';

const redirectToElba = (errorCode: string) =>
  NextResponse.redirect(`${env.ELBA_REDIRECT_URL}?error=${errorCode}`);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serverState = request.cookies.get('organisationId')?.value;

  try {
    const [code, state, error] = [
      searchParams.get('code'),
      searchParams.get('state'),
      searchParams.get('error'),
    ];

    if (error === 'access_denied') {
      return redirectToElba('unauthorized');
    }

    if (typeof code !== 'string') {
      return redirectToElba('internal_error');
    }

    if (!state || state !== serverState) {
      return redirectToElba('internal_error');
    }

    await generateAccessToken({ authenticationCode: code, organisationId: state });

    return NextResponse.redirect(env.ELBA_REDIRECT_URL);
  } catch (error) {
    return redirectToElba('internal_error');
  }
}
