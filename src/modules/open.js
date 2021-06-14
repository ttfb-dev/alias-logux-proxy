import { logger } from '../libs/index.js';

const open = (server) => {
  server.type('log/send', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const { userId } = ctx;
      const { level, data } = action;
      try {
        await logger.exec(level, 'vk-miniapp-cli', { ...data, userId });
      } catch (e) {
        await logger.critical(e.message, { type: 'log/send', level, data });
      }
    },
  });

  server.type('analytics/send', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const { userId } = ctx;
      const { action: userAction, data } = action;
      try {
        await logger.execAnalytics('vk-miniapp-cli', userAction, userId, data);
      } catch (e) {
        await logger.critical(e.message, { type: 'analytics/send', level, data });
      }
    },
  });
};

export { open };
