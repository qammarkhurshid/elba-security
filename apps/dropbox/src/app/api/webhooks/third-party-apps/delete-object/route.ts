import { NextResponse } from 'next/server';
import { deleteThirdPartyAppsObject } from './service';

export async function POST(request: Request) {
  const organisation = await request.json();

  const response = await deleteThirdPartyAppsObject(organisation);

  return NextResponse.json(response);
}
