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

  server.type('game/get_words', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);

      ctx.data = { roomId, userId };

      return true;
    },
    async process(ctx, action, meta) {
      const { roomId } = ctx.data;

      const gameId = await gameService.getRoomGameId(roomId);

      const words = await gameService.getRandomWords(roomId, gameId);

      ctx.sendBack({
        type: 'game/set_words',
        words,
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
      const gameId = await gameService.getRoomGameId(roomId);

      ctx.data = { userId, roomId, gameId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;
      const { word, index } = action;

      if (index === undefined) {
        await gameService.pushStepWord(roomId, gameId, word);
      } else {
        await gameService.replaceStepWord(roomId, gameId, word, index);
      }
    },
  });

  server.type('game/set_step_history', {
    async access(ctx) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);
      const gameId = await gameService.getRoomGameId(roomId);

      ctx.data = { userId, roomId, gameId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;
      const { step } = action;

      await gameService.pushStepHistory(roomId, gameId, step);
    },
  });

  server.type('game/set_next_step', {
    async access(ctx) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);
      const gameId = await gameService.getRoomGameId(roomId);

      ctx.data = { userId, roomId, gameId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;
      const { step, stepNumber, roundNumber } = action;

      await gameService.setCurrentStep(roomId, gameId, step);
      await gameService.setRoomGameRound(roomId, gameId, roundNumber);
      await gameService.setRoomGameStep(roomId, gameId, stepNumber);
    },
  });

  server.type('game/step_end', {
    async access(ctx) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);
      const gameId = await gameService.getRoomGameId(roomId);

      ctx.data = { userId, roomId, gameId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;

      await gameService.setGameStatus(roomId, gameId, gameService.storageKeys.statuses.lobby);
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
