import { eventHandler } from '../services';

const events = (httpServer, server) => {
  httpServer.post('/event', async (request, response) => {
    const event = request.body;
    try {
      await eventHandler.process(event, server);
      res.status(200).send();
    } catch (e) {
      logger.critical(e.message, {
        path: `/event`,
        event,
      });
      res.status(400).send();
    }
  });
};

export default events;
