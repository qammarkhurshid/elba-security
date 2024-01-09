import { z } from 'zod';
import { env } from '@/env';
import { NotionError } from './commons/error';

const getTokenResponseDataSchema = z.union([
  z.object({
    access_token: z.string().min(1),
    workspace_id: z.string().min(1),
  }),
  // TODO: notion doc says it returns an property error: string https://developers.notion.com/docs/authorization
  // so it's perhaps z.object({ error: z.string() })
  z.object({ error_description: z.string().nullable() }),
]);

export const getToken = async (code: string) => {
  try {
    const credentials = Buffer.from(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`).toString(
      'base64'
    );

    const response = await fetch(`${env.NOTION_API_BASE_URL}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: env.NOTION_REDIRECT_URL,
      }),
    });

    if (!response.ok) {
      throw new NotionError('Could not retrieve token', { response });
    }

    const data: unknown = await response.json();
    const result = getTokenResponseDataSchema.safeParse(data);

    if (!result.success) {
      throw result.error;
    }

    if ('error_description' in result.data) {
      throw new NotionError('Could not retrieve token', {
        response,
        cause: result.data.error_description,
      });
    }

    return result.data;
  } catch (error) {
    if (error instanceof NotionError) {
      throw error;
    }
    throw new NotionError('Could not retrieve token', { cause: error });
  }
};
