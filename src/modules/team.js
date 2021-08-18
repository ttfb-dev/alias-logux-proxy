import ErrorResponse from '../contracts/errorResponse';
import { roomService, teamService } from '../services';

const team = (server) => {
  server.type('room/team_join', {
    async access(ctx, action, meta) {
      const roomId = action.roomId;
      const userId = parseInt(ctx.userId, 10);
      const currentTeam = await teamService.getMyTeam(roomId, userId);
      //допускаем только тех кто не в команде
      return currentTeam === null;
    },
    async process(ctx, action, meta) {
      const roomId = action.roomId;
      const teamId = parseInt(action.teamId, 10);
      const userId = parseInt(ctx.userId, 10);

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
        teamId,
        userId,
        teams: result,
      });

      ctx.sendBack({
        type: 'room/join_team_success',
        myTeamId: teamId,
      });
    },
  });

  server.type('room/team_leave', {
    async access(ctx, action, meta) {
      const roomId = action.roomId;
      const userId = parseInt(ctx.userId, 10);
      const currentTeam = await teamService.getMyTeam(roomId, userId);
      //допускаем только тех кто находится в команде
      return currentTeam !== null;
    },
    async process(ctx, action, meta) {
      const roomId = action.roomId;
      const userId = parseInt(ctx.userId, 10);

      const result = await teamService.leaveTeam(roomId, userId);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/leave_team_error',
          ...result,
        });

        return;
      }

      await server.log.add({
        type: 'room/user_left_team',
        roomId,
        userId,
        teams: result,
      });

      ctx.sendBack({
        type: 'room/leave_team_success',
        myTeamId: null,
      });
    },
  });

  server.type('room/team_change', {
    async access(ctx, action, meta) {
      const userId = parseInt(ctx.userId, 10);
      const roomId = await roomService.whereIAm(userId);

      ctx.data = { userId, roomId };

      return !!roomId;
    },
    resend(ctx, action, meta) {
      return `room/${ctx.data.roomId}`;
    },
    async process(ctx, action, meta) {
      const { roomId, userId } = ctx.data;
      const { teams } = action;

      try {
        await teamService.changeTeam(roomId, teams);

        const teamId = await teamService.getTeamIdByUserId(roomId, userId);

        ctx.sendBack({
          type: 'room/team_change_success',
          myTeamId: teamId,
        });
      } catch (e) {
        await logger.critical(e.message, {
          method: 'room/team_change',
          roomId,
          teams,
        });
      }
    },
  });

  server.type('room/team_create', {
    async access(ctx, action, meta) {
      const roomId = action.roomId;
      const userId = parseInt(ctx.userId, 10);
      const currentRoom = await roomService.whereIAm(userId);
      //допускаем только тех кто находится в комнате
      return currentRoom === roomId;
    },
    async process(ctx, action, meta) {
      const roomId = action.roomId;
      const teamName = action.teamName;

      const result = await roomService.createTeam(roomId, teamName);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/team_create_error',
          ...result,
        });

        return;
      }

      await server.log.add({
        type: 'room/team_created',
        roomId,
        teams: result,
      });

      ctx.sendBack({
        type: 'room/team_create_success',
      });
    },
  });

  server.type('room/team_delete', {
    async access(ctx, action, meta) {
      const roomId = action.roomId;
      const teamId = parseInt(action.teamId, 10);
      const userId = parseInt(ctx.userId, 10);
      ctx.data = { roomId, teamId, userId };
      const currentRoom = await roomService.whereIAm(userId);
      //проверяем, что комната пустая и удаляющий в текущей комнате
      return currentRoom === roomId;
    },
    async process(ctx, action, meta) {
      const { roomId, teamId, userId } = ctx.data;

      const isEmpty = await roomService.isTeamEmpty(roomId, teamId);
      const teamsCount = await roomService.getTeamsCount(roomId);

      if (!isEmpty) {
        server.undo(action, meta, 'error', {
          message: 'В команде остались люди',
        });
        return;
      }

      if (teamsCount <= 1) {
        server.undo(action, meta, 'error', {
          message: 'Для игры нужна минимум одна команда',
        });
        return;
      }

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
        teams: result,
      });

      ctx.sendBack({
        type: 'room/team_delete_success',
      });
    },
  });

  server.type('room/team_rename', {
    async access(ctx, action, meta) {
      const roomId = action.roomId;
      const userId = parseInt(ctx.userId, 10);
      const currentRoom = await roomService.whereIAm(userId);

      ctx.data = { roomId, userId };

      return currentRoom === roomId;
    },
    async process(ctx, action, meta) {
      const { roomId } = ctx.data;
      const teamId = parseInt(action.teamId, 10);
      const teamName = action.teamName;

      const result = await roomService.renameTeam(roomId, teamId, teamName);

      if (result instanceof ErrorResponse) {
        ctx.sendBack({
          type: 'room/team_rename_error',
          ...result,
        });

        return;
      }

      await server.log.add({
        type: 'room/team_renamed',
        roomId,
        teams: result,
      });

      ctx.sendBack({
        type: 'room/team_rename_success',
      });
    },
  });

  /** client actions */
  //событие присоединения к команды
  server.type('room/user_joined_team', {
    access() {
      return true;
    },
    async resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });

  //событие отключения от команды
  server.type('room/user_left_team', {
    access() {
      return true;
    },
    async resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });

  // событие создания команды
  server.type('room/team_created', {
    access() {
      return true;
    },
    async resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });

  // событие удаления команды
  server.type('room/team_deleted', {
    access() {
      return true;
    },
    async resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });

  // событие переименования команды
  server.type('room/team_renamed', {
    access() {
      return true;
    },
    async resend(ctx, action, meta) {
      return `room/${action.roomId}`;
    },
  });
};

export default team;
