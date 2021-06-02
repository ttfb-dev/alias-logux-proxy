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

      const game = await gameService.getGame(roomId, gameId);
      
      return {
        type: 'room/game_state',
        game,
      };
    },
  });

  server.type('room/start_game', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const roomId = parseInt(action.roomId);

      ctx.data = { userId, roomId };

      try {
        const isRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        const canStartGame = await gameService.canStartGame(roomId);

        return isRoomOwner && canStartGame;
      } catch (e) {
        await logger.critical(e.message, {type: 'room/start_game', action, userId})
      }
    },
    async process(ctx, action, meta) {
      const { userId, roomId } = ctx.data;
      
      try {
        const gameId = await gameService.startGame(roomId);

        await logger.info('Игра началась', {type: 'room/start_game', action});

        await server.log.add({
          type: 'room/game_started',
          roomId,
          gameId,
        });
      } catch (e) {
        await logger.critical(e.message, {type: 'room/start_game', action, userId})
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
