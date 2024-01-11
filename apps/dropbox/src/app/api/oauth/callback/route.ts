import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken } from './service';
import { env } from '@/common/env';

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
      return NextResponse.redirect(`${env.ELBA_REDIRECT_URL}?error=unauthorized`);
    }

    if (typeof code !== 'string') {
      return NextResponse.redirect(`${env.ELBA_REDIRECT_URL}?error=internal_error`);
    }

    if (!state || state !== serverState) {
      return NextResponse.redirect(`${env.ELBA_REDIRECT_URL}?error=internal_error`);
    }

    await generateAccessToken({ authenticationCode: code, organisationId: state });

    return NextResponse.redirect(env.ELBA_REDIRECT_URL);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'authentication failed',
      },
      { status: 401 }
    );
  }
}
