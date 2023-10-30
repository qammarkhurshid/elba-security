import { html } from '@elysiajs/html';
import { swagger } from '@elysiajs/swagger';
import { Layout } from 'src/components/Layout';
import { createElysia } from 'src/util/elysia';
import { routes as apiRoutes } from './api';

export const app = createElysia()
  .use(swagger())
  .use(html())
  .use(apiRoutes)
  .get('/', async (ctx) => {
    return <Layout>elba Microsoft TPAC</Layout>;
  })
  .get('/health', (ctx) => 'ok');

export type App = typeof app;
