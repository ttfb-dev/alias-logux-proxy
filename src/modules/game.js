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

        return {
          type: 'game/state',
          game,
        };
      } catch (e) {
        await logger.critical(e.message, {
          action: 'room/:roomId/game',
          method: 'load',
        });
      }
    },
  });

  server.type('game/set_step', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);

      ctx.data = { userId, roomId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
    async process(ctx, action, meta) {
      await logger.debug('got action', { action: 'room/setStep', ...action });
    },
  });

  server.type('game/get_words', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);

      ctx.data = { roomId, userId };

      return true;
    },
    async process(ctx, action, meta) {
      const { roomId } = ctx.data;

      const memOnStart = process.memoryUsage().heapTotal;

      const gameId = await gameService.getRoomGameId(roomId);

      const words = await gameService.getRandomWords(roomId, gameId);

      const memOnEnd = process.memoryUsage().heapTotal;

      console.log(`memory usage: ${memOnEnd - memOnStart}`);

      ctx.sendBack({
        type: 'game/set_words',
        words,
      });
    },
  });

  server.type('game/set_timestamp', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);
      ctx.data = { userId, roomId };
      return true;
    },
    resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
    async process(ctx, action, meta) {
      await logger.debug('got action', {
        action: 'room/setTimestamp',
        ...action,
      });
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
