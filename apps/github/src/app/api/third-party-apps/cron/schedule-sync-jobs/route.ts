import { NextResponse } from 'next/server';
import { scheduleThirdPartyAppsSyncJobs } from './service';

export const runtime = 'edge';

export async function GET() {
  const result = await scheduleThirdPartyAppsSyncJobs();
  return NextResponse.json(result, { status: 200 });
}
