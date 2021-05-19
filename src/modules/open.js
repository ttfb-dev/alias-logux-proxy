import { logger } from "../services/index.js";

const open = (server) => {
  server.type("log/send_init", {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const { level, data, user_id } = action;

      await logger.exec(level, 'vk-miniapp-cli', { ...data, user_id });

      ctx.sendBack({
        type: "log/send_success",
      });
    },
  });
};

export { open };
