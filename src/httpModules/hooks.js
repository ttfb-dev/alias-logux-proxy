import { profileService, roomService } from '../services';

const hooks = {
  renewDatasets: (httpServer, server) => {
    httpServer.get(
      '/user/:user_id/change-subscription-status',
      async (request, response) => {
        const userId = parseInt(request.params.user_id);
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
          type: 'profile/buy_game_dataset_success',
          datasets,
        });
        response.send('OK');
      },
    );
  },
};

export default hooks;
