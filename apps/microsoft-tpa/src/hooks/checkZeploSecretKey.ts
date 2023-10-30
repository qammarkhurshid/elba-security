import { Context } from 'elysia';
import { env } from 'src/env';

export const checkZeploSecretKey = async ({
  set,
  request: { headers },
}: Context<any>) => {
  const zeploSecretKey = headers.get('ZEPLO_SECRET_KEY');
  if (zeploSecretKey !== env.ZEPLO_SECRET_KEY) {
    set.status = 401;
    return { message: 'Unauthorized' };
  }
};
