import { logger } from '../libs/index.js';

const open = (server) => {
  server.type('log/send_init', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const { userId } = ctx;
      const { level, data } = action;

      await logger.exec(level, 'vk-miniapp-cli', { ...data, userId });

      ctx.sendBack({
        type: 'log/send_success',
      });
    },
  });

  server.type('analytics/send_init', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const { userId } = ctx;
      const { action, platform, data } = action;

      await logger.exec(level, 'vk-miniapp-cli', { ...data, userId });

      ctx.sendBack({
        type: 'log/send_success',
      });
    },
  });
};

export { open };
