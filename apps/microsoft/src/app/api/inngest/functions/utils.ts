import { RetryAfterError } from 'inngest';

type MicrosoftGraphErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

export const handleError = (error: unknown) => {
  if (error instanceof Error && error.response) {
    const headers = error.response.headers;
    const isRateLimitError = error.code === 'requestLimitExceeded';

    if (isRateLimitError && headers['x-ratelimit-reset']) {
      const retryAfter = new Date(Number(headers['x-ratelimit-reset']) * 1000);
      throw new RetryAfterError('Microsoft rate limit reached', retryAfter);
    } else if (error.response?.data?.error) {
      const graphError = error.response.data.error as MicrosoftGraphErrorResponse;
      throw new Error(
        `Microsoft Graph API Error: ${graphError.error.code} - ${graphError.error.message}`
      );
    }
  }

  throw error;
};
