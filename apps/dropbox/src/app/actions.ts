'use server';

import { cookies } from 'next/headers';

export async function create(data) {
  console.log(
    '---http://localhost:3000/?organisation_id=hwlloworldhttp://localhost:3000/?organisation_id=hwlloworldhttp://localhost:3000/?organisation_id=hwlloworldhttp://localhost:3000/?organisation_id=hwlloworld---------------------------------------------'
  );
  console.log();
  console.log('------------------------------------------------');
  // @ts-ignore
  cookies().set('name', 'lee');
}
