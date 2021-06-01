import { logger } from '../libs/index.js';
import { roomService, gameService } from '../services/index.js';

const game = (server) => {

  server.channel('room/:roomId/game/:gameId', {
    async access(ctx, action, meta) {
      const roomId = parseInt(ctx.params.roomId);
      const gameId = parseInt(ctx.params.gameId);
      const userId = parseInt(ctx.userId);

      ctx.data = { roomId, gameId, userId };

      const currentRoomId = await roomService.whereIAm(userId);

      const currentGameId = await gameService.getRoomGameId(roomId);

      return currentRoomId === roomId && currentGameId === gameId;
    },
    async load(ctx, action, meta) {
      const { roomId, gameId, userId } = ctx.data;
      
      

      return {
        type: 'room/game_state',
      };
    },
  });

  server.type('room/start_game', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const roomId = parseInt(action.roomId);

      try {
        const isRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        const canStartGame = await gameService.canStartGame(roomId);

        return isRoomOwner && canStartGame;
      } catch (e) {
        await logger.critical(e.message, {type: 'room/start_game', action, userId})
      }
    },
    async process(ctx, action, meta) {
      const roomId = parseInt(action.roomId);
      
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
