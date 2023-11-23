import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { elbaRequestHandlers } from './elba-request-handlers';

const server = setupServer(...elbaRequestHandlers);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterAll(() => {
  server.close();
});
afterEach(() => {
  server.resetHandlers();
});
