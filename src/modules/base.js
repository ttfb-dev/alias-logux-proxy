import { logger } from '../libs/index.js';
import parser from 'ua-parser-js';

const base = (server) => {
  server.type('log/send', {
    async access() {
      return true;
    },
    async process(ctx, action, meta) {
      const { userId } = ctx;
      const { level, data } = action;

      try {
        await logger.exec(level, 'vk-miniapp', { ...data, userId });
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
      const { event, userAgent, data } = action;

      try {
        const { browser, os, device } = parser(userAgent);
        
        await logger.execAnalytics(
          'vk-miniapp',
          event,
          userId,
          { browser, os, device, ...data },
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
