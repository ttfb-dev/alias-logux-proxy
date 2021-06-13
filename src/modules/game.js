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
      const gameId = await gameService.getRoomGameId(roomId);

      ctx.data = { userId, roomId, gameId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;
      const { startedAt } = action;
      try {
        const roundNumber = await gameService.getRoomGameRound(roomId, gameId);
        const stepNumber = await gameService.getRoomGameStep(roomId, gameId);

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
      } catch (e) {
        await logger.critical(e.message, {method: 'game/step_start', roomId, gameId, startedAt });
      }
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

      try {
        if (index === undefined) {
          await gameService.pushStepWord(roomId, gameId, word);
        } else {
          await gameService.replaceStepWord(roomId, gameId, word, index);
        }
      } catch (e) {
        await logger.critical(e.message, {method: 'game/set_step_word', roomId, gameId, word, index });
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

      try {
        await gameService.pushStepHistory(roomId, gameId, step);
      } catch (e) {
        await logger.critical(e.message, {method: 'game/set_step_history', roomId, gameId, step});
      }
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

      try {
        await gameService.setCurrentStep(roomId, gameId, step);
        await gameService.setRoomGameRound(roomId, gameId, roundNumber);
        await gameService.setRoomGameStep(roomId, gameId, stepNumber);
      } catch (e) {
        await logger.critical(e.message, {method: 'game/set_next_step', roomId, gameId, step, stepNumber, roundNumber});
      }
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
      try {
        await gameService.setGameStatus(roomId, gameId, gameService.storageKeys.statuses.lobby);
      } catch (e) {
        await logger.critical(e.message, {method: 'game/step_end', roomId, gameId});
      }
    },
  });
};

export { game };
