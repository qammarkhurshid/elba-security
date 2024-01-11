import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const {
    nextUrl: { pathname },
  } = request;
  const { searchParams } = new URL(request.url);
  const organisationId = searchParams.get('organisation_id');

  if (organisationId && pathname === '/') {
    const response = NextResponse.next();
    response.cookies.set('organisationId', organisationId);
    return response;
  }
}

export const config = {
  matcher: ['/'],
};
