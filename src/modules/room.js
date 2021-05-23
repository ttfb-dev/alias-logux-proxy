import ErrorResponse from '../contracts/errorResponse.js';
import { logger } from '../libs/index.js';
import { RoomService } from '../services/index.js';

const roomService = new RoomService();

const room = (server) => {
  server.channel('room/:roomId', {
    async access(ctx, action, meta) {
      const roomId = parseInt(ctx.params.roomId);
      const { userId } = ctx;

      const currentRoomId = await roomService.whereIAm(userId);

      if (currentRoomId !== roomId) {
        await logger.debug('room: access failed', {userId, roomId, currentRoomId})
        return false;
      }
      await logger.debug(`uid ${userId}: room/${roomId} subscribed`, {userId, roomId})
      return true;
    },
    async load(ctx, action, meta) {
      const { roomId } = ctx.params;
      const { userId } = ctx;

      const room = await roomService.getRoomDetail(roomId);

      return {
        type: 'room/loaded',
        roomId: roomId,
        online: server.connected.values(),
        room,
      }
    },
    async unsubscribe(ctx, action, meta) {
      const roomId = parseInt(ctx.params.roomId);
      const { userId } = ctx;
      await logger.debug(`uid ${userId}: room/${roomId} unsubscribed`, {userId, roomId})
      return true;
    },
  })

  server.type('room/join', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const { roomId } = action;
      const { userId } = ctx;

      const result = await roomService.joinRoom(userId, roomId);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/join_error',
          ...result,
        });

        return;
      }

      ctx.sendBack({
        type: 'room/join_success',
      });
    },
  });

  server.type('room/create', {
    async access(ctx, action, meta) {
      return true;
    },
    async process(ctx, action, meta) {
      const { userId } = ctx;

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
      const { userId } = ctx;

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
      const { userId } = ctx;

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
};

export { room };
