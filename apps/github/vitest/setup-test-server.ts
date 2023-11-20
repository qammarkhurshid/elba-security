import { setupServer } from 'msw/node';
import { beforeAll, afterAll, afterEach } from 'vitest';
import { http, passthrough } from 'msw';
import { elbaRequestHandlers } from './elba-request-handlers';

const server = setupServer(
  http.all('http://localhost:1234/*', () => passthrough()),
  ...elbaRequestHandlers
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterAll(() => {
  server.close();
});
afterEach(() => {
  server.resetHandlers();
});
