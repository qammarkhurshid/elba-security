import { RequestError } from '@octokit/request-error';
import { RetryAfterError } from 'inngest';

export const handleError = (error: unknown) => {
  if (
    error instanceof RequestError &&
    error.response?.headers['x-ratelimit-remaining'] === '0' &&
    error.response.headers['x-ratelimit-reset']
  ) {
    const retryAfter = new Date(Number(error.response.headers['x-ratelimit-reset']) * 1000);
    throw new RetryAfterError('Github rate limit reached', retryAfter);
  } else {
    throw error;
  }
};
