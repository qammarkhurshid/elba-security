import { NextResponse } from 'next/server';
import { scheduleUsersSyncJobs } from './service';

export const runtime = 'edge';

export async function GET() {
  const result = await scheduleUsersSyncJobs();
  return NextResponse.json(result, { status: 200 });
}
