import { logger } from '../libs';

const metrics = (httpServer) => {
  httpServer.post('/metrics', async (request, response) => {
    try {
      const { event, userId, ...data } = request.body;
      await logger.metrics(event ? event : '', userId, data);
      response.status(200).send();
    } catch ({ message }) {
      await logger.critical(message);
    }
  });
};

export default metrics;
