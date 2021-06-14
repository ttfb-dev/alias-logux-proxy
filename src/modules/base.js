import { logger } from '../libs/index.js';

const base = (server) => {
  server.type('log/send', {
    async access() {
      return true;
    },
    async process(ctx, action, meta) {
      const { userId } = ctx;
      const { level, data } = action;

      try {
        await logger.exec(level, 'frontend-miniapp', { ...data, userId });
      } catch (e) {
        await logger.critical(e.message, { type: 'log/send', level, data });
      }
    },
  });

  server.type('analytics/send', {
    async access() {
      return true;
    },
    async process(ctx, action, meta) {
      const { userId } = ctx;
      const { action: userAction, data } = action;

      try {
        await logger.execAnalytics(
          'frontend-miniapp',
          userAction,
          userId,
          data,
        );
      } catch (e) {
        await logger.critical(e.message, {
          type: 'analytics/send',
          level,
          data,
        });
      }
    },
  });
};

export default base;
