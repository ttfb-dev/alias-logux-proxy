import ErrorResponse from '../contracts/errorResponse.js';
import { logger } from '../libs/index.js';
import { TeamService, RoomService } from '../services/index.js';

const teamService = new TeamService();
const roomService = new RoomService();

const team = (server) => {
  
  server.type('room/team_join', {
    async access(ctx, action, meta) {
      const roomId = parseInt(action.roomId);
      const userId = parseInt(ctx.userId);
      const currentTeam = await teamService.getMyTeam(roomId, userId);
      //допускаем только тех кто не в команде
      return currentTeam === null;
    },
    async process(ctx, action, meta) {
      const roomId = parseInt(action.roomId);
      const teamId = parseInt(action.teamId);
      const userId = parseInt(ctx.userId);

      const result = await teamService.joinTeam(roomId, teamId, userId);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/join_team_error',
          ...result,
        });

        return;
      }

      const room = await roomService.getRoomDetail(roomId, userId);

      await server.log.add({
        type: 'room/user_joined_team',
        roomId,
        teamId,
        userId,
        teams: room.teams,
      });

      ctx.sendBack({
        type: 'room/join_team_success',
        myTeam: room.myTeam,
      });
    },
  });
  
  server.type('room/team_leave', {
    async access(ctx, action, meta) {
      const roomId = parseInt(action.roomId);
      const userId = parseInt(ctx.userId);
      const currentTeam = await teamService.getMyTeam(roomId, userId);
      //допускаем только тех кто находится в команде
      return currentTeam !== null;
    },
    async process(ctx, action, meta) {
      const roomId = parseInt(action.roomId);
      const userId = parseInt(ctx.userId);

      const result = await teamService.leaveTeam(roomId, userId);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/leave_team_error',
          ...result,
        });

        return;
      }

      const room = await roomService.getRoomDetail(roomId, userId);

      await server.log.add({
        type: 'room/user_left_team',
        roomId,
        userId,
        teams: room.teams,
      });

      ctx.sendBack({
        type: 'room/leave_team_success',
        myTeam: null,
      });
    },
  });

  server.type('room/team_create', {
    async access(ctx, action, meta) {
      const roomId = parseInt(action.roomId);
      const userId = parseInt(ctx.userId);
      const currentRoom = await roomService.whereIAm(userId);
      //допускаем только тех кто находится в комнате
      return currentRoom === roomId;
    },
    async process(ctx, action, meta) {
      const roomId = parseInt(action.roomId);
      const userId = parseInt(ctx.userId);
      const teamName = action.teamName;

      const result = await roomService.createTeam(roomId, teamName);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/team_create_error',
          ...result,
        });

        return;
      }

      const room = await roomService.getRoomDetail(roomId, userId);

      await server.log.add({
        type: 'room/team_created',
        roomId,
        userId,
        teams: room.teams,
      });

      ctx.sendBack({
        type: 'room/team_create_success',
        teams: room.teams,
      });
    },
  });

  server.type('room/team_delete', {
    async access(ctx, action, meta) {
      const roomId = parseInt(action.roomId);
      const teamId = parseInt(action.teamId);
      const userId = parseInt(ctx.userId);
      const currentRoom = await roomService.whereIAm(userId);
      //проверяем, что комната пустая и удаляющий в текущей комнате
      return await roomService.isTeamEmpty(roomId, teamId) && currentRoom === roomId;
    },
    async process(ctx, action, meta) {
      const roomId = parseInt(action.roomId);
      const userId = parseInt(ctx.userId);

      const result = await roomService.deleteTeam(roomId, teamId);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/team_delete_error',
          ...result,
        });

        return;
      }

      await server.log.add({
        type: 'room/team_deleted',
        roomId,
        userId,
        teams: result,
      });

      ctx.sendBack({
        type: 'room/team_delete_success',
        teams: result,
      });
    },
  });

  /** client actions */
  //событие присоединения к команды
  server.type('room/user_joined_team', {
    access() {
      return true;
    },
    async resend (ctx, action, meta) {
      await logger.debug('user_joined', { ctx: typeof ctx.userId, action: typeof action.userId })
      if (parseInt(ctx.userId) !== action.userId) {
        return `room/${ action.roomId }`
      }
    },
  });

  //событие отключения от команды
  server.type('room/user_left_team', {
    access() {
      return true;
    },
    async resend (ctx, action, meta) {
      return `room/${ action.roomId }`
    },
  });

  // событие создания команды
  server.type('room/team_created', {
    access() {
      return true;
    },
    async resend (ctx, action, meta) {
      return `room/${ action.roomId }`
    },
  });
};

export { team };
