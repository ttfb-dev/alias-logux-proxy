import parser from 'ua-parser-js';

import { logger } from '../libs';

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
      const { event, data } = action;

      try {
        const { browser, os, device } = parser(
          ctx.server.clientIds.get(ctx.clientId).httpHeaders['user-agent'],
        );

        await logger.execAnalytics('vk-miniapp', event, userId, {
          browser,
          os,
          device,
          ...data,
        });
      } catch (e) {
        await logger.critical(e.message, {
          type: 'analytics/send',
          level,
          data,
        });
      }
    },
  });

  server.type('metrics/send', {
    async access() {
      return true;
    },
    async process(ctx, action, meta) {
      const { userId } = ctx;
      const { event, data } = action;

      try {
        const { browser, os, device } = parser(
          ctx.server.clientIds.get(ctx.clientId).httpHeaders['user-agent'],
        );

        await logger.execMetrics('vk-miniapp', event, userId, {
          browser,
          os,
          device,
          ...data,
        });
      } catch (e) {
        await logger.critical(e.message, {
          type: 'metrics/send',
          level,
          data,
        });
      }
    },
  });
};

export default base;
