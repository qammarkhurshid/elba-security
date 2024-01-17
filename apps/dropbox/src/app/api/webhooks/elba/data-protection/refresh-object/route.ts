import { NextResponse } from 'next/server';
import { deleteObjectPermissions } from './service';

export async function POST(request: Request) {
  const object = await request.json();

  const response = await deleteObjectPermissions(object);

  return NextResponse.json(response, { status: 200 });
}
