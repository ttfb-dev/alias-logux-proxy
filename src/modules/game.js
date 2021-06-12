import { prs, logger } from '../libs/index.js';
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
      const { roomId, gameId } = ctx.data;
      try {
        const game = await gameService.getGame(roomId, gameId);

        console.log(game);

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
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      await logger.debug('got action', { action: 'game/set_step', ...action });
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
        action: 'game/set_timestamp',
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

  server.type('game/step_start', {
    async access(ctx) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);

      ctx.data = { userId, roomId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      const { roomId } = ctx.data;
      const { startedAt } = action;
      const gameId = await gameService.getRoomGameId(roomId);
      const roundNumber = await prs.getRoomGameParam(
        roomId,
        gameId,
        gameService.storageKeys.round,
        1,
      );
      const stepNumber = await prs.getRoomGameParam(
        roomId,
        gameId,
        gameService.storageKeys.step,
        1,
      );

      await gameService.setGameStatus(
        roomId,
        gameId,
        gameService.storageKeys.statuses.step,
      );
      await gameService.setStepStartedAt(
        roomId,
        gameId,
        roundNumber,
        stepNumber,
        startedAt,
      );
    },
  });

  server.type('game/set_step_word', {
    async access(ctx) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);

      ctx.data = { userId, roomId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      const { roomId } = ctx.data;
      const { word, index } = action;

      const gameId = await gameService.getRoomGameId(roomId);

      if (index === undefined) {
        console.log('push word', roomId, gameId, word)
        await gameService.pushStepWord(roomId, gameId, word);
      } else {
        console.log('replace word', roomId, gameId, word, index)
        await gameService.replaceStepWord(roomId, gameId, word, index);
      }
    },
  });

  // server.type('game/step_end', {
  //   async access() {
  //     return true;
  //   },
  //   resend(ctx, action, meta) {
  //     return `room/${action.roomId}`;
  //   },
  //   async process(ctx, action, meta) {
  //     const roomId = parseInt(action.roomId);
  //     const gameId = await gameService.getRoomGameId(roomId);

  //     await gameService.pushStepWord(roomId, gameId, word);
  //   },
  // });
};

export { game };
