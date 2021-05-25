import ErrorResponse from '../contracts/errorResponse.js';
import { logger } from '../libs/index.js';
import { RoomService, TeamService } from '../services/index.js';

const roomService = new RoomService();
const teamService = new TeamService();

const team = (server) => {
  
  server.type('room/team_join', {
    async access(ctx, action, meta) {
      const roomId = parseInt(action.roomId);
      const userId = parseInt(ctx.userId);
      const currentTeam = await roomService.getMyTeam(roomId, userId);
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

      await server.log.add({
        type: 'room/user_joined_team',
        roomId,
        userId,
      });

      ctx.sendBack({
        type: 'room/join_team_success',
      });
    },
  });
};

export { team };
