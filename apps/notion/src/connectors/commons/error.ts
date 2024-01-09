type NotionErrorOptions = { response?: Response; cause?: unknown };

export class NotionError extends Error {
  response?: Response;

  constructor(message: string, { response, cause }: NotionErrorOptions = {}) {
    super(message, { cause });
    this.response = response;
  }
}
