import { EVENTS, logger } from '../libs';

class EventHandler {
  async process(event, server) {
    switch (event.name) {
      default:
        logger.critical('got event', { event });
        break;
    }
  }
}

export default new EventHandler();
