import parser from 'ua-parser-js';

import ErrorResponse from '../contracts/errorResponse';
import { logger } from '../libs';
import { gameService, roomService, wordService } from '../services';

const room = (server) => {
  server.channel('room/:roomId', {
    async access(ctx, action, meta) {
      try {
        const roomId = ctx.params.roomId;
        const userId = parseInt(ctx.userId, 10);

        ctx.data = { roomId, userId };

        const currentRoomId = await roomService.whereIAm(userId);

        if (currentRoomId === null) {
          return false;
        }

        if (currentRoomId !== roomId) {
          await logger.error('channel subscribe failed', {
            userId,
            channel: 'room/:roomId',
            currentRoomId,
            roomId,
          });
          return false;
        }

        return true;
      } catch ({ message }) {
        await logger.critical(message, {
          action: 'room/:roomId',
          method: 'access',
        });
      }
    },
    async load(ctx, action, meta) {
      const { roomId, userId } = ctx.data;

      try {
        const room = await roomService.getRoomDetail(roomId, userId);
        const gameId = await gameService.getRoomGameId(roomId);
        const game = await gameService.getGame(roomId, gameId);

        const randomRoomNames = await wordService.getRandomRoomNames();
        const randomTeamNames = await wordService.getRandomTeamNames();

        return {
          type: 'room/state',
          room,
          game,
          randomRoomNames,
          randomTeamNames,
        };
      } catch ({ message }) {
        await logger.critical(message, {
          action: 'room/:roomId',
          method: 'load',
        });
      }
    },
  });

  server.type('room/join', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);

      ctx.data = { userId };

      return true;
    },

    async process(ctx, action, meta) {
      const { roomId, method } = action;
      const { userId } = ctx.data;

      try {
        // если уже присоеденены к какой-либо комнате
        const currentRoomId = await roomService.whereIAm(userId);
        if (currentRoomId) {
          const errorJoined = new ErrorResponse(
            'user_already_in_room',
            `Вы уже находитесь в ${currentRoomId} комнате.`,
            { room_id: currentRoomId },
          );
          server.undo(action, meta, 'denied', {
            message: errorJoined.message,
          });
          return;
        }

        // проверяем статус комнаты
        const isRoomActive = await roomService.isRoomActive(roomId);
        if (!isRoomActive) {
          const errorNotFoundOrClosed = new ErrorResponse(
            'room_does_not_exist_or_closed',
            'Комната, к которой вы пытаетесь присоединиться не существует или закрыта',
          );
          server.undo(action, meta, 'denied', {
            message: errorNotFoundOrClosed.message,
          });
          return;
        }

        await roomService.joinRoom(userId, roomId);
        await roomService.refreshRoomDatasets(roomId);

        const { members, teams, gameWordDatasets } =
          await roomService.getRoomDetail(roomId, userId);

        await server.log.add({
          type: 'room/user_joined',
          roomId,
          userId,
          members,
          teams,
          gameWordDatasets,
        });

        const { browser, os, device } = parser(
          ctx.server.clientIds.get(ctx.clientId).httpHeaders['user-agent'],
        );

        await logger.analytics('room.join', userId, {
          room_id: roomId,
          join_method: method,
          browser,
          os,
          device,
        });
      } catch ({ message }) {
        server.undo(action, meta, 'error', {
          message,
        });
      }
    },
  });

  server.type('room/create', {
    async accessAndProcess(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);

      try {
        const currentRoomId = await roomService.whereIAm(userId);
        if (currentRoomId) {
          const error = new ErrorResponse(
            'user_already_in_room',
            `Вы уже присоеденены к комнате ${currentRoomId}`,
            { room_id: currentRoomId },
          );

          ctx.sendBack({
            type: 'room/create_error',
            ...error,
          });

          return;
        }

        const roomId = await roomService.createRoom(userId);

        const { browser, os, device } = parser(
          ctx.server.clientIds.get(ctx.clientId).httpHeaders['user-agent'],
        );

        await logger.analytics('room.create', userId, {
          room_id: roomId,
          browser,
          os,
          device,
        });

        ctx.sendBack({
          type: 'room/create_success',
          roomId,
        });
      } catch ({ message }) {
        await logger.critical(message, userId);
      }
    },
  });

  server.type('room/rename', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const roomId = action.roomId;

      ctx.data = { roomId, userId };

      const currentRoom = await roomService.whereIAm(userId);

      return roomId === currentRoom;
    },
    async process(ctx, action, meta) {
      const { roomId } = ctx.data;
      const roomName = action.roomName;

      const result = await roomService.renameRoom(roomId, roomName);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/rename_error',
          ...result,
        });

        return;
      }

      await server.log.add({
        type: 'room/renamed',
        roomId,
        settings: result,
      });

      ctx.sendBack({
        type: 'room/rename_success',
      });
    },
  });

  server.type('room/leave', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);

      const roomId = await roomService.whereIAm(userId);

      if (!roomId) {
        ctx.sendBack({
          type: 'room/leave_success',
        });

        return;
      }

      const result = await roomService.leaveRoom(userId, roomId);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/leave_error',
          ...result,
        });

        return;
      }

      await roomService.refreshRoomDatasets(roomId);

      const { teams, gameWordDatasets, members } =
        await roomService.getRoomDetail(roomId, userId);

      await server.log.add({
        type: 'room/user_left',
        roomId,
        userId,
        teams,
        members,
        gameWordDatasets,
      });

      ctx.sendBack({
        type: 'room/leave_success',
      });
    },
  });

  server.type('room/where_i_am', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);

      const result = await roomService.whereIAm(userId);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/where_i_am_error',
          ...result,
        });

        return;
      }

      ctx.sendBack({
        type: 'room/where_i_am_success',
        roomId: result,
      });
    },
  });

  server.type('room/toggle_dataset', {
    async access(ctx, action, meta) {
      try {
        const userId = parseInt(ctx.userId, 10);
        const datasetId = parseInt(action.id);

        const roomId = await roomService.whereIAm(userId);

        ctx.data = { roomId, userId, datasetId };

        const isItMyRoomId = await roomService.isItMyRoomId(userId, roomId);

        const amIRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        const isDatasetAvailableToToggle =
          await roomService.isDatasetAvailableToToggle(roomId, datasetId);

        return isItMyRoomId && amIRoomOwner && isDatasetAvailableToToggle;
      } catch ({ message }) {
        logger.critical(message, {
          type: 'room/toggle_dataset/access',
          action,
          userId: ctx.userId,
        });
      }
      return false;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      try {
        const { roomId, datasetId } = ctx.data;
        const datasetStatus = await roomService.getDatasetStatus(
          roomId,
          datasetId,
        );
        if (datasetStatus === 'inactive') {
          await roomService.activateGameDataset(roomId, datasetId);
        } else if (datasetStatus === 'active') {
          await roomService.deactivateGameDataset(roomId, datasetId);
        }
      } catch ({ message }) {
        logger.critical(message, {
          type: 'room/activate_word_dataset/access',
          action,
          userId: ctx.userId,
        });
      }
    },
  });

  //deprecated, see room/toggle_dataset
  server.type('room/activate_game_dataset', {
    async access(ctx, action, meta) {
      try {
        const userId = parseInt(ctx.userId, 10);
        const datasetId = parseInt(action.id, 10);

        const roomId = await roomService.whereIAm(userId);

        ctx.data = { roomId, userId, datasetId };

        const isItMyRoomId = await roomService.isItMyRoomId(userId, roomId);

        const amIRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        const isDatasetAvailableToActivate =
          await roomService.isDatasetAvailableToActivate(roomId, datasetId);

        return isItMyRoomId && amIRoomOwner && isDatasetAvailableToActivate;
      } catch ({ message }) {
        logger.critical(message, {
          type: 'room/activate_word_dataset/access',
          action,
          userId: ctx.userId,
        });
      }
      return false;
    },
    resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
    async process(ctx, action, meta) {
      try {
        const { roomId, datasetId } = ctx.data;
        await roomService.activateGameDataset(roomId, datasetId);
      } catch ({ message }) {
        logger.critical(message, {
          type: 'room/activate_word_dataset/process',
          action,
          userId: ctx.userId,
        });
      }
    },
  });

  //deprecated, see room/toggle_dataset
  server.type('room/deactivate_game_dataset', {
    async access(ctx, action, meta) {
      try {
        const userId = parseInt(ctx.userId, 10);
        const datasetId = parseInt(action.id, 10);

        const roomId = await roomService.whereIAm(userId);

        ctx.data = { roomId, userId, datasetId };

        const isItMyRoomId = await roomService.isItMyRoomId(userId, roomId);

        const amIRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        const isDatasetAvailableToDeactivate =
          await roomService.isDatasetAvailableToDeactivate(roomId, datasetId);

        return isItMyRoomId && amIRoomOwner && isDatasetAvailableToDeactivate;
      } catch ({ message }) {
        logger.critical(message, {
          type: 'room/deactivate_game_dataset/access',
          action,
          userId: ctx.userId,
        });
      }
      return false;
    },
    resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
    async process(ctx, action, meta) {
      const { roomId, datasetId } = ctx.data;
      await roomService.deactivateGameDataset(roomId, datasetId);
    },
  });

  server.type('room/update_settings', {
    async access(ctx, action, meta) {
      try {
        const userId = parseInt(ctx.userId, 10);

        const roomId = await roomService.whereIAm(userId);

        ctx.data = { roomId, userId };

        const isItMyRoomId = await roomService.isItMyRoomId(userId, roomId);

        const amIRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        return isItMyRoomId && amIRoomOwner;
      } catch ({ message }) {
        logger.critical(message, {
          type: 'room/update_settings/access',
          action,
          userId: ctx.userId,
        });
      }
      return false;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      try {
        const { roomId } = ctx.data;
        const { settings } = action;
        await roomService.updateSettings(roomId, settings);
      } catch ({ message }) {
        logger.critical(message, {
          type: 'room/update_settings/process',
          action,
          userId: ctx.userId,
        });
      }
    },
  });

  /** client actions */
  //событие присоединения к комнате
  server.type('room/user_joined', {
    access() {
      return true;
    },
    resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });

  //событие отключения от комнаты
  server.type('room/user_left', {
    access() {
      return true;
    },
    resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });

  //событие изменения настроек комнаты
  server.type('room/renamed', {
    access() {
      return true;
    },
    resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });

  //событие покупки набора слов в комнате
  server.type('room/dataset_purchased', {
    access() {
      return true;
    },
    resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });
};

export default room;
