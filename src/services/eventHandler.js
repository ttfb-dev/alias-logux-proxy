import { EVENTS } from '../libs';

class EventHandler {
  async process(event, server) {
    switch (event.name) {
      default:
        console.log(event);
        break;
    }
  }
}

export default new EventHandler();
