import { expect, test, describe } from 'vitest';
import { createFunctionMock } from '@/inngest/__mocks__/inngest';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createFunctionMock(handleSlackWebhookEvent, 'slack/webhook.handle');

describe('handle-slack-webhook-event', () => {
  test('should be ignored if event is not handled', async () => {
    const [result, { step }] = setup({
      event: {
        // @ts-expect-error -- This is a unhandled event that doesn't exist
        type: 'unknown',
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'Ignored: unhandled slack event type',
      type: 'unknown',
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
