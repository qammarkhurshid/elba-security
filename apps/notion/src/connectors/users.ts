import { env } from '@/env';
import { NotionError } from './commons/error';

type Person = {
  email: string;
};

export type NotionUser = {
  id: string;
  object: string;
  name: string;
  person: Person;
  type: string;
};

export type ElbaUser = {
  id: string;
  displayName: string;
  email: string;
  additionalEmails: string[];
};

type GetUsersResponseData = { results: NotionUser[]; next_cursor: string | null };

export const getUsers = async (token: string, page: string | null) => {
  const url = new URL(`${env.NOTION_API_BASE_URL}/v1/users`);
  url.searchParams.append('page_size', env.USERS_SYNC_JOB_BATCH_SIZE.toString());
  if (page) url.searchParams.append('start_cursor', page)

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': env.NOTION_VERSION
    }
  });

  if (!response.ok) {
    throw new NotionError('Could not retrieve users', { response });
  }

  return response.json() as Promise<GetUsersResponseData>;
};
