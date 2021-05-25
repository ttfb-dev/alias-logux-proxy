import ErrorResponse from '../contracts/errorResponse.js';
import { logger } from '../libs/index.js';
import { RoomService, TeamService } from '../services/index.js';

const roomService = new RoomService();
const teamService = new TeamService();

const room = (server) => {
  
  server.type('room/team/join', {
    async access(ctx, action, meta) {
      const { roomId } = action;
      const { userId } = ctx;
      const currentTeam = await roomService.getMyTeam(roomId, userId);
      //допускаем только тех кто не в комнате
      return currentTeam === null;
    },
    async process(ctx, action, meta) {
      const { roomId, teamId } = action;
      const { userId } = ctx;

      const result = await teamService.joinTeam(roomId, teamId, userId);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/join_error',
          ...result,
        });

        return;
      }

      await server.log.add({
        type: 'room/user_joined',
        roomId,
        userId,
      });

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

      await server.log.add({
        type: 'room/user_left',
        roomId,
        userId,
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

  /** client actions */
  //событие присоединения к комнате
  server.type('room/user_joined', {
    access() {
      return true;
    },
    async resend (ctx, action, meta) {
      return `room/${ action.roomId }`
    },
  });

  //событие отключения от комнаты
  server.type('room/user_left', {
    access() {
      return true;
    },
    async resend (ctx, action, meta) {
      return `room/${ action.roomId }`
    },
  });
};

export { room };
