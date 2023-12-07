import type { SlackWebhookHandlerContext, SlackEventHandlers } from './types';
import { messageHandler } from './message';
import { userChangeHandler } from './user-change';
import { channelUnarchiveHandler } from './channel-unarchive';
// import { channelIdChangedHandler } from './channel-id-changed';
import { channelCreatedHandler } from './channel-created';
import { channelDeletedHandler } from './channel-deleted';
import { channelRenameHandler } from './channel-rename';
import { channelArchiveHandler } from './channel-archive';
import { channelIdChangedHandler } from './channel-id-changed';
import { teamDomainChangedHandler } from './team-domain-changed';

const slackEventHandlers: SlackEventHandlers = {
  message: messageHandler,
  // app_uninstalled: async () => {},
  // tokens_revoked: async () => {},
  channel_archive: channelArchiveHandler,
  channel_created: channelCreatedHandler, // TODO: test
  channel_deleted: channelDeletedHandler, // TODO: test
  // app_rate_limited: async () => {},
  channel_id_changed: channelIdChangedHandler, // TODO: test,
  channel_rename: channelRenameHandler, // TODO: test
  channel_unarchive: channelUnarchiveHandler, // TODO: test
  // channel_shared: async () => {},
  // channel_unshared: async () => {},
  // // channel_joined: async () => {}, // NOT AVAILABLE
  // channel_left: async () => {},
  // // team_rename: async () => {},
  // tokens_revoked: async () => {},
  // user_profile_changed: async () => {}, // Same as user_change
  // team_join: async () => {}, // We could use user_change instead
  team_domain_changed: teamDomainChangedHandler, // state of the world scan
  user_change: userChangeHandler,
};

export const slackEventHandler = async (context: SlackWebhookHandlerContext) => {
  const payload = context.event.data;
  const type = payload.event.type;
  const eventHandler = slackEventHandlers[type];
  if (!eventHandler) {
    return { message: 'Ignored: unhandled slack event type', type };
  }

  return eventHandler(payload as never, context);
};
