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
      //допускаем только тех кто не в комнате
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
      //допускаем только тех кто находится в комнате
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

  // server.type('room/team_create', {
  //   async access(ctx, action, meta) {
  //     const roomId = parseInt(action.roomId);
  //     const userId = parseInt(ctx.userId);
  //     const currentRoom = await roomService.whereIAm(userId);
  //     //допускаем только тех кто находится в комнате
  //     return currentRoom === roomId;
  //   },
  //   async process(ctx, action, meta) {
  //     const roomId = parseInt(action.roomId);
  //     const userId = parseInt(ctx.userId);
  //     const teamName = action.teamName;

  //     const result = await roomService.createTeam(roomId, teamName);

  //     if (result instanceof ErrorResponse) {
  //       ctx.sendBack({
  //         type: 'room/team_create_error',
  //         ...result,
  //       });

  //       return;
  //     }

  //     const room = await roomService.getRoomDetail(roomId, userId);

  //     await server.log.add({
  //       type: 'room/team_created',
  //       roomId,
  //       userId,
  //       teams: room.teams,
  //     });

  //     ctx.sendBack({
  //       type: 'room/team_create_success',
  //       myTeam: null,
  //     });
  //   },
  // })

  /** client actions */
  //событие присоединения к команды
  server.type('room/user_joined_team', {
    access() {
      return true;
    },
    async resend (ctx, action, meta) {
      return `room/${ action.roomId }`
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

  //событие создания команды
  // server.type('room/team_created', {
  //   access() {
  //     return true;
  //   },
  //   async resend (ctx, action, meta) {
  //     return `room/${ action.roomId }`
  //   },
  // });
};

export { team };
