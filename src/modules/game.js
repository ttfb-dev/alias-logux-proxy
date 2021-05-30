import { logger } from '../libs/index.js';
import { RoomService, GameService } from '../services/index.js';

const roomService = new RoomService();
const gameService = new GameService();

const game = (server) => {

  server.type('room/start_game', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const roomId = parseInt(action.roomId);

      try {
        const isRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        const canStartGame = await gameService.canStartGame(roomId);

        return isRoomOwner && canStartGame;
      } catch (error) {
        server.undo(action, meta, 'error', {extra: {...error}});
      }
    },
    async process(ctx, action, meta) {
      await logger.debug('process room/start_game', {action});
    },
  });
};

export { game };
