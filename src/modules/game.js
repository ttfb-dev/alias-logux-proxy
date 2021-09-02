import { analytics, logger } from '../libs';
import { gameService, roomService } from '../services';

const game = (server) => {
  server.type('game/start', {
    async accessAndProcess(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const roomId = await roomService.whereIAm(userId);

      ctx.data = { userId, roomId };

      try {
        const isRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        const canStartGame = await gameService.canStartGame(roomId);

        if (isRoomOwner && canStartGame) {
          const gameId = await gameService.startGame(roomId);

          const { members, teams, gameWordDatasets } =
            await roomService.getRoomDetail(roomId, userId);

          await logger.analytics('game.start', userId, {
            roomId,
            gameId,
            membersCount: members.length,
            members: members.map((member) => ({
              name: `${member.first_name}  ${member.last_name}`,
              id: member.id,
            })),
            teams,
            gameWordDatasets,
          });
        }
      } catch (e) {
        await logger.critical(e.message, {
          type: 'game/start',
          action,
          userId,
          e,
        });
      }
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
  });

  server.type('game/finish', {
    async accessAndProcess(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const roomId = await roomService.whereIAm(userId);
      const { reason } = action;

      ctx.data = { userId, roomId };

      try {
        const canFinishGame = await roomService.isRoomInGame(roomId);

        if (canFinishGame) {
          const gameId = await gameService.getRoomGameId(roomId);
          await roomService.setRoomStatus(
            roomId,
            roomService.storageKeys.statuses.lobby,
          );

          await logger.analytics('game.finish', userId, {
            roomId,
            gameId,
            reason,
          });
        }
      } catch (e) {
        await logger.critical(e.message, {
          type: 'game/finish',
          action,
          userId,
        });
      }
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
  });

  server.type('step/get_words', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const roomId = await roomService.whereIAm(userId);

      ctx.data = { roomId, userId };

      return true;
    },
    async process(ctx, action, meta) {
      const { roomId } = ctx.data;

      const gameId = await gameService.getRoomGameId(roomId);

      const words = await gameService.getRandomWords(roomId, gameId);

      ctx.sendBack({
        type: 'step/set_words',
        words,
      });
    },
  });

  server.type('step/start', {
    async access(ctx) {
      const userId = parseInt(ctx.userId, 10);
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
          method: 'step/start',
          roomId,
          gameId,
          startedAt,
        });
      }
    },
  });

  server.type('step/finish', {
    async access(ctx) {
      const userId = parseInt(ctx.userId, 10);
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
        await gameService.setGameStatus(
          roomId,
          gameId,
          gameService.storageKeys.statuses.lobby,
        );
      } catch (e) {
        await logger.critical(e.message, {
          method: 'step/finish',
          roomId,
          gameId,
        });
      }
    },
  });

  server.type('step/set_word', {
    async access(ctx) {
      const userId = parseInt(ctx.userId, 10);
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
      const { word } = action;

      try {
        await gameService.setStepWordWithScore(roomId, gameId, word);
      } catch (e) {
        await logger.critical(e.message, {
          method: 'step/set_word',
          roomId,
          gameId,
          word,
        });
      }
    },
  });

  server.type('step/edit_word', {
    async access(ctx) {
      const userId = parseInt(ctx.userId, 10);
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
        await gameService.editStepWordWithScore(roomId, gameId, word, index);
      } catch (e) {
        await logger.critical(e.message, {
          method: 'step/edit_word',
          roomId,
          gameId,
          word,
          index,
        });
      }
    },
  });

  server.type('step/set_history', {
    async access(ctx) {
      const userId = parseInt(ctx.userId, 10);
      const roomId = await roomService.whereIAm(userId);
      const gameId = await gameService.getRoomGameId(roomId);

      ctx.data = { userId, roomId, gameId };

      return true;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      const { roomId, gameId, userId } = ctx.data;

      try {
        const { roundNumber, stepNumber } =
          await gameService.getGameStepAndRound(roomId, gameId);
        const currentStep = await gameService.getCurrentStep(
          roomId,
          gameId,
          roundNumber,
          stepNumber,
        );
        analytics.setStepWordsGuessed(userId, currentStep.words);
        await gameService.pushStepHistory(roomId, gameId, currentStep);
      } catch (e) {
        await logger.critical(e.message, {
          method: 'step/set_history',
          roomId,
          gameId,
        });
      }
    },
  });

  server.type('step/next', {
    async access(ctx) {
      const userId = parseInt(ctx.userId, 10);
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
          method: 'step/next',
          roomId,
          gameId,
          step,
          stepNumber,
          roundNumber,
        });
      }
    },
  });
};

export default game;
