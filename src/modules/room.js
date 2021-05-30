import ErrorResponse from '../contracts/errorResponse.js';
import { logger } from '../libs/index.js';
import { RoomService, WordService } from '../services/index.js';

const roomService = new RoomService();
const wordService = new WordService();

const room = (server) => {
  server.channel('room/:roomId', {
    async access(ctx, action, meta) {
      const roomId = parseInt(ctx.params.roomId);
      const userId = parseInt(ctx.userId);

      ctx.data = { roomId, userId };

      const currentRoomId = await roomService.whereIAm(userId);

      return currentRoomId === roomId;
    },
    async load(ctx, action, meta) {
      const { roomId, userId } = ctx.data;
      const room = await roomService.getRoomDetail(roomId, userId);

      console.log(room);

      const randomRoomNames = await wordService.getRandomRoomNames(
        room.settings.lang,
      );
      const randomTeamNames = await wordService.getRandomTeamNames(
        room.settings.lang,
      );

      return {
        type: 'room/state',
        room,
        randomRoomNames,
        randomTeamNames,
      };
    },
    /*     filter(ctx, action, meta) {
      return (roomCtx, roomAction, roomMeta) => ctx.userId !== roomCtx.userId;
    }, */
  });

  server.type('room/join', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const { roomId } = action;
      const userId = parseInt(ctx.userId);

      const result = await roomService.joinRoom(userId, roomId);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/join_error',
          ...result,
        });

        return;
      }

      await roomService.refreshRoomDatasets(roomId);

      const room = await roomService.getRoomDetail(roomId, userId);

      await server.log.add({
        type: 'room/user_joined',
        roomId,
        userId,
        memberIds: room.memberIds,
        gameWordDatasets: room.gameWordDatasets,
      });

      ctx.sendBack({
        type: 'room/join_success',
        roomId,
      });
    },
  });

  server.type('room/create', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const userId = parseInt(ctx.userId);

      const result = await roomService.createRoom(userId);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/create_error',
          ...result,
        });

        return;
      }

      ctx.sendBack({
        type: 'room/create_success',
        roomId: result,
      });
    },
  });

  server.type('room/rename', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId);
      const roomId = parseInt(action.roomId);

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
      const userId = parseInt(ctx.userId);

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

      const room = await roomService.getRoomDetail(roomId, userId);

      await server.log.add({
        type: 'room/user_left',
        roomId,
        userId,
        memberIds: room.memberIds,
        gameWordDatasets: room.gameWordDatasets,
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
      const userId = parseInt(ctx.userId);

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

  server.type('room/activate_game_dataset', {
    async access(ctx, action, meta) {
      try {
        const roomId = parseInt(action.roomId);
        const userId = parseInt(ctx.userId);
        const datasetId = parseInt(action.datasetId);

        ctx.data = { roomId, userId, datasetId };

        const isItMyRoomId = await roomService.isItMyRoomId(userId, roomId);

        const amIRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        const isDatasetAvailableToActivate =
          await roomService.isDatasetAvailableToActivate(roomId, datasetId);

        return isItMyRoomId && amIRoomOwner && isDatasetAvailableToActivate;
      } catch (e) {
        logger.critical(e.message, {
          type: 'room/activate_word_dataset',
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
      await roomService.activateGameDataset(roomId, datasetId);
    },
  });

  server.type('room/deactivate_game_dataset', {
    async access(ctx, action, meta) {
      try {
        const roomId = parseInt(action.roomId);
        const userId = parseInt(ctx.userId);
        const datasetId = parseInt(action.datasetId);

        ctx.data = { roomId, userId, datasetId };

        const isItMyRoomId = await roomService.isItMyRoomId(userId, roomId);

        const amIRoomOwner = await roomService.amIRoomOwner(userId, roomId);

        const isDatasetAvailableToDeactivate =
          await roomService.isDatasetAvailableToDeactivate(roomId, datasetId);

        return isItMyRoomId && amIRoomOwner && isDatasetAvailableToDeactivate;
      } catch (e) {
        logger.critical(e.message, {type: 'room/activate_game_dataset', action, userId: ctx.userId});
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

export { room };
