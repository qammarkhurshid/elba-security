import { NextResponse, type NextRequest } from 'next/server';
import { handleThirdPartyAppsSyncRequested } from './service';

export const dynamic = 'force-dynamic';

export const POST = async (req: NextRequest) => {
  // TODO: implement authentication
  // TODO: use SDK types or util
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- conveniency
  const { organisationId } = await req.json();

  const result = await handleThirdPartyAppsSyncRequested(organisationId as string);

  return NextResponse.json(result);
};
