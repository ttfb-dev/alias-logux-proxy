import ErrorResponse from '../contracts/errorResponse.js';
import { logger } from '../libs/index.js';
import { RoomService, GameService } from '../services/index.js';

const roomService = new RoomService();
const gameService = new GameService();

const game = (server) => {

  // server.channel('room/:roomId/game/:gameId', {
  //   async access(ctx, action, meta) {
  //     const roomId = parseInt(ctx.params.roomId);
  //     const gameId = parseInt(ctx.params.gameId);
  //     const userId = parseInt(ctx.userId);

  //     ctx.data = { roomId, gameId, userId };
  //     const currentRoomId = await roomService.whereIAm(userId);

  //     const roomGameId = await gameService.getRoomGameId(roomId);

  //     const roomInGame = await gameService.isRoomInGame(roomId);

  //     return roomInGame && currentRoomId === roomId && roomGameId === gameId;
  //   },
  //   async load(ctx, action, meta) {
  //     const { roomId, userId } = ctx.data;
  //     const room = await roomService.getRoomDetail(roomId, userId);

  //     const randomRoomNames = await wordService.getRandomRoomNames(
  //       room.settings.lang,
  //     );
  //     const randomTeamNames = await wordService.getRandomTeamNames(
  //       room.settings.lang,
  //     );

  //     return {
  //       type: 'room/state',
  //       room,
  //       randomRoomNames,
  //       randomTeamNames,
  //     };
  //   },
  //   /*     filter(ctx, action, meta) {
  //     return (roomCtx, roomAction, roomMeta) => ctx.userId !== roomCtx.userId;
  //   }, */
  // });

  server.type('room/start_game', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const roomId = parseInt(action.roomId);

      try {
        const isRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        const canStartGame = await gameService.canStartGame(roomId);

        return isRoomOwner && canStartGame;
      } catch (error) {
        server.undo(action, meta, 'error', {error});
        return false;
      }
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const { datasetId } = action;

      const roomId = await roomService.whereIAm(userId);

      await profileService.addPurchasedDatasetId(userId, datasetId);

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

      ctx.sendBack({
        type: 'profile/buy_game_dataset_success',
        datasets,
      });
    },
  });
};

export { game };
