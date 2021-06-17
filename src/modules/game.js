import { logger } from '../libs';
import { roomService, gameService } from '../services';

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

  server.type('game/step_start', {
    async access(ctx) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);
      const gameId = await gameService.getRoomGameId(roomId);

      ctx.data = { userId, roomId, gameId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}/game`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;
      const { startedAt } = action;
      try {
        const { roundNumber, stepNumber } =
          await gameService.getGameStepAndRound(roomId, gameId);

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
        await logger.critical(e.message, {
          method: 'game/step_start',
          roomId,
          gameId,
          startedAt,
        });
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
      return `room/${ctx.data.roomId}/game`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;
      const { word } = action;

      try {
        await gameService.setStepWordWithScore(roomId, gameId, word);
      } catch (e) {
        await logger.critical(e.message, {
          method: 'game/set_step_word',
          roomId,
          gameId,
          word,
        });
      }
    },
  });

  server.type('game/edit_step_word', {
    async access(ctx) {
      const userId = parseInt(ctx.userId);
      const roomId = await roomService.whereIAm(userId);
      const gameId = await gameService.getRoomGameId(roomId);

      ctx.data = { userId, roomId, gameId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}/game`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;
      const { word, index } = action;

      try {
        await gameService.editStepWordWithScore(roomId, gameId, word, index);
      } catch (e) {
        await logger.critical(e.message, {
          method: 'game/edit_step_word',
          roomId,
          gameId,
          word,
          index,
        });
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
      return `room/${ctx.data.roomId}/game`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;

      try {
        const { roundNumber, stepNumber } =
          await gameService.getGameStepAndRound(roomId, gameId);
        const currentStep = await gameService.getCurrentStep(
          roomId,
          gameId,
          roundNumber,
          stepNumber,
        );
        await gameService.pushStepHistory(roomId, gameId, currentStep);
      } catch (e) {
        await logger.critical(e.message, {
          method: 'game/set_step_history',
          roomId,
          gameId,
        });
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
      return `room/${ctx.data.roomId}/game`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;
      const { step, stepNumber, roundNumber } = action;

      try {
        // Пушим отыгравшие слова
        const stepWords = await gameService.getStepWords(roomId, gameId);
        const usedWordList = stepWords.map((stepWord) => stepWord.index);
        const usedWords = await gameService.pushManyUsedGameWords(
          roomId,
          gameId,
          usedWordList,
        );
        // Подменяем запрошенные слова использованными
        await gameService.setRoomGameRequestedWords(roomId, gameId, usedWords);

        await gameService.setRoomGameRound(roomId, gameId, roundNumber);
        await gameService.setRoomGameStep(roomId, gameId, stepNumber);
        await gameService.setCurrentStep(
          roomId,
          gameId,
          roundNumber,
          stepNumber,
          step,
        );
      } catch (e) {
        await logger.critical(e.message, {
          method: 'game/set_next_step',
          roomId,
          gameId,
          step,
          stepNumber,
          roundNumber,
        });
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
      return `room/${ctx.data.roomId}/game`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId } = ctx.data;

      try {
        await gameService.setGameStatus(
          roomId,
          gameId,
          gameService.storageKeys.statuses.lobby,
        );
      } catch (e) {
        await logger.critical(e.message, {
          method: 'game/step_end',
          roomId,
          gameId,
        });
      }
    },
  });
};

export default game;
