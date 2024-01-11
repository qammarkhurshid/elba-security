import { NextResponse, type NextRequest } from 'next/server';
import { deleteObject } from './service';

export const dynamic = 'force-dynamic';

export const POST = async (req: NextRequest) => {
  // TODO: implement authentication
  // TODO: use SDK types or util
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- conveniency
  const { organisationId, metadata, appId, userId } = await req.json();

  const result = await deleteObject({ organisationId, appId, userId, grantId: metadata.grantId });

  return NextResponse.json(result);
};
