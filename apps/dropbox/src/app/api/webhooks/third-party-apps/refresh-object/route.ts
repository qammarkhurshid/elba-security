import { NextResponse } from 'next/server';
import { refreshThirdPartyAppsObject } from './service';

export async function POST(request: Request) {
  const organisation = await request.json();

  const response = await refreshThirdPartyAppsObject(organisation);

  return NextResponse.json(response);
}
