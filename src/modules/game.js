import { logger } from '../libs/index.js';
import { roomService, gameService } from '../services/index.js';

const game = (server) => {

  server.channel('room/:roomId/game', {
    async access(ctx, action, meta) {
      const roomId = parseInt(ctx.params.roomId);
      const userId = parseInt(ctx.userId);

      const currentRoomId = await roomService.whereIAm(userId);

      const gameId = await gameService.getRoomGameId(roomId);

      ctx.data = { roomId, gameId, userId };

      return currentRoomId === roomId && gameId;
    },
    async load(ctx, action, meta) {
      const { roomId, gameId, userId } = ctx.data;

      try {
        const game = await gameService.getGame(roomId, gameId);
        await logger.debug('room loaded', game);

        return {
          type: 'game/state',
          game,
        };
      } catch (e) {
        await logger.critical(e.message, ctx.data);
      }
    },
  });

  // сообщаем всем, что игра началась
  server.type('room/game_started', {
    access() {
      return true;
    },
    resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });
};

export { game };
