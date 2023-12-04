import { NextResponse, type NextRequest } from 'next/server';
import { handleElbaOrganisationActivated } from './service';

export const POST = async (req: NextRequest) => {
  // TODO: implement authentication
  // TODO: use SDK types or util
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- conveniency
  const { organisationId } = await req.json();

  const result = await handleElbaOrganisationActivated(organisationId as string);

  return NextResponse.json(result);
};
