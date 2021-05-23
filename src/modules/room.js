import ErrorResponse from '../contracts/errorResponse.js';
import { logger } from '../libs/index.js';
import { RoomService } from '../services/index.js';

const roomService = new RoomService();

const room = (server) => {
  server.channel('room/:roomId', {
    async access(ctx, action, meta) {
      const { roomId } = ctx.params;
      const { userId } = ctx;
      await logger.debug('room: access', {userId, roomId })
    },
    async unsubscribe(ctx, action, meta) {
      const { roomId } = ctx.params;
      const { userId } = ctx;
      await logger.debug('room: unsubscribe', {userId, roomId })
    },
    async finally(ctx, action, meta) {
      const { roomId } = ctx.params;
      const { userId } = ctx;
      await logger.debug('room: finally', {userId, roomId })
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
      const { roomId } = action;
      const { userId } = ctx;

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
