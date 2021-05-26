import ErrorResponse from '../contracts/errorResponse.js';
import { logger } from '../libs/index.js';
import { RoomService } from '../services/index.js';

const roomService = new RoomService();

const room = (server) => {
  server.channel('room/:roomId', {
    async access(ctx, action, meta) {
      const roomId = parseInt(ctx.params.roomId);
      const userId = parseInt(ctx.userId);

      const currentRoomId = await roomService.whereIAm(userId);

      if (currentRoomId !== roomId) {
        await logger.debug('room: access failed', {
          userId,
          roomId,
          currentRoomId,
        });
        return false;
      }
      await logger.debug(`uid ${userId}: room/${roomId} subscribed`, {
        userId,
        roomId,
      });
      return true;
    },
    async load(ctx, action, meta) {
      const roomId = parseInt(ctx.params.roomId);
      const userId = parseInt(ctx.userId);

      const room = await roomService.getRoomDetail(roomId, userId);

      return {
        type: 'room/state',
        room,
      };
    },
    async unsubscribe(ctx, action, meta) {
      const roomId = parseInt(ctx.params.roomId);
      const userId = parseInt(ctx.userId);
      await logger.debug(`uid ${userId}: room/${roomId} unsubscribed`, {
        userId,
        roomId,
      });
      return true;
    },
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

      const room = await roomService.getRoomDetail(roomId, userId);

      await server.log.add({
        type: 'room/user_joined',
        roomId,
        userId,
        members: room.members,
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

      const room = await roomService.getRoomDetail(roomId, userId);

      await server.log.add({
        type: 'room/user_left',
        roomId,
        userId,
        members: room.members,
      });

      ctx.sendBack({
        type: 'room/leave_success',
        roomId: null,
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

  /** client actions */
  //событие присоединения к комнате
  server.type('room/user_joined', {
    access() {
      return true;
    },
    async resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });

  //событие отключения от комнаты
  server.type('room/user_left', {
    access() {
      return true;
    },
    async resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });
};

export { room };
