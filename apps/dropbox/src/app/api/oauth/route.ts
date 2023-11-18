import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateAccessToken } from './service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cookiesList = cookies();
  // const organisationId = cookiesList.get('organisationId')?.value;
  const responseCookies = NextResponse.next();
  let serverState = request.cookies.get('organisationId')?.value;

  try {
    const [code, state, error] = [
      searchParams.get('code'),
      searchParams.get('state'),
      searchParams.get('error'),
    ];

    console.log('Dbx Callback params', {
      code,
      state,
      error,
      serverState,
    });

    if (error === 'access_denied') {
      return NextResponse.redirect('https://admin.elba.ninja');
    }

    if (typeof code !== 'string') {
      return NextResponse.redirect('https://admin.elba.ninja');
    }

    if (!state || state !== serverState) {
      return NextResponse.redirect('https://admin.elba.ninja');
    }

    await generateAccessToken({ authenticationCode: code, organisationId: state });

    return new NextResponse(JSON.stringify({ success: true, message: 'authentication success' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (error) {
    console.log(error);
    return new NextResponse(JSON.stringify({ success: false, message: 'authentication failed' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
}
