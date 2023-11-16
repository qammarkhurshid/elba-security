import { NextResponse } from 'next/server';
import { runThirdPartyAppsSyncJobs } from './service';

export const runtime = 'edge';

export async function GET() {
  const result = await runThirdPartyAppsSyncJobs();
  return NextResponse.json(result);
}
