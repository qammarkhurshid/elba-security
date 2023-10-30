import { createElysia } from 'src/util/elysia';
import { routes as authRoutes } from './auth';
import { routes as scanRoutes } from './scan';

export const routes = createElysia({ prefix: '/api' })
  .use(authRoutes)
  .use(scanRoutes);
