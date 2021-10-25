import { EVENTS, logger } from '../libs';

class EventHandler {
  async process(event, server) {
    switch (event.name) {
      case EVENTS.USER_COMPLETE_EVENT_HALLOWEEN_2021:
        await notifyAboutDatasets(event.userId, server);
        break;
      default:
        logger.critical('got event', { event });
        break;
    }
  }
}

const notifyAboutDatasets = async (userId, server) => {
  const roomId = await roomService.whereIAm(userId);

  const datasets = await profileService.getDatasetsWithStatus(userId);

  if (roomId) {
    await roomService.refreshRoomDatasets(roomId);
    const room = await roomService.getRoomDetail(roomId);
    await server.log.add({
      type: 'room/dataset_purchased',
      roomId,
      gameWordDatasets: room.gameWordDatasets,
    });
  }

  await server.log.add({
    userId,
    type: 'profile/datasets_changed',
    datasets,
  });
};

export default new EventHandler();
