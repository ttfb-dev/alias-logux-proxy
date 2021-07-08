import { logger } from '../libs';

const metrics = (httpServer) => {
  httpServer.post('/metrics', async (request, response) => {
    try {
      const rows = request.body;
      await rows.forEach(async ({ event, userId, ...data }) => {
        await logger.metrics(event ? event : '', userId, data);
      });
      response.status(200).send();
    } catch ({ message }) {
      await logger.critical(message);
    }
  });
};

export default metrics;
