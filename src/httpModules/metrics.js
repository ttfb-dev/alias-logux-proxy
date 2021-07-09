import { logger } from '../libs';

const metrics = (httpServer) => {
  httpServer.post('/metrics', async (request, response) => {
    try {
      const rows = JSON.parse(request.body);
      await rows.forEach(async ({ event, userId, ...data }) => {
        await logger.metrics(event, userId, data);
      });
    } catch ({ message }) {
      await logger.critical(message);
    }
    response.end();
  });
};

export default metrics;
