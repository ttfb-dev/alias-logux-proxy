import parser from 'ua-parser-js';

import { logger } from '../libs';

const metrics = (httpServer) => {
  httpServer.post('/metrics', async (request, response) => {
    try {
      const { browser, os, device } = parser(request.headers['user-agent']);
      if (!request.body || request.body === '') {
        return;
      }
      const rows = JSON.parse(request.body);
      rows.forEach(async ({ event, userId, ...data }) => {
        await logger.execMetrics('vk-miniapp', event, userId, {
          browser,
          os,
          device,
          ...data,
        });
      });
    } catch ({ message }) {
      await logger.critical(message, { body: request.body });
    }
    response.end();
  });
};

export default metrics;
