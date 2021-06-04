import { prs, logger } from '../libs/index.js';

import { roomService } from './index.js';

class GameService {

  constructor() {
    this.storageKeys = {
      currentGameId: 'current_game_id',
      currentMoveTeamId: 'current_move_team_id',
      round: 'round',
      step: 'step',
      status: 'status',
      statuses: {
        lobby: 'lobby',
        step: 'step',
        step_review: 'step_review',
      },
    };
  }

  async canStartGame(roomId) {
    const room = await roomService.getRoom(roomId);

    const teams = room.teams;

    let notEmptyTeamsCounter = 0;

    // В каждой команде минимум по 2 игрока
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];

      if (team.memberIds.length === 1) {
        throw false;
      }

      if (team.memberIds.length) {
        notEmptyTeamsCounter += 1;
      }
    }

    // Есть хотя бы 2 команды с пользователями
    if (notEmptyTeamsCounter < 2) {
      throw false;
    }

    // Есть хотя бы один включенный набор слов
    const activeDatasetIds = await roomService.getRoomActiveGameDatasetIds(roomId);

    if (activeDatasetIds.length === 0) {
      throw false;
    }

    return true;
  }

  async getRoomGameId(roomId) {
    return await prs.getRoomParam(roomId, this.storageKeys.currentGameId, null);
  }

  async isRoomInGame(roomId) {
    const roomStatus = await roomService.getRoomStatus(roomId);
    return roomStatus === roomService.storageKeys.status.game;
  }

  async getGame(roomId, gameId) {
    return {
      status: await this.getGameStatus(roomId, gameId),
      round:  await prs.getRoomGameParam(roomId, gameId, this.storageKeys.round, 1),
      step:   await prs.getRoomGameParam(roomId, gameId, this.storageKeys.step, 1),
    };
  }

  async startGame(roomId) {
    await roomService.setRoomInGame(roomId);
    const gameId = await prs.getNextInt(`room_${roomId}_game_id`);
    await prs.setRoomParam(roomId, this.storageKeys.currentGameId, gameId);

    await this.setGameStatus(roomId, gameId, this.storageKeys.statuses.lobby);

    // const currentTeamId = await this.getNextTeamId(roomId, gameId);
    // await this.setCurrentTeamId(roomId, gameId, currentTeamId);

    // await this.setNewRound(roomId, gameId);

    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.round, 1);
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.step, 1);
  }

  async setGameStatus(roomId, gameId, status) {
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.status, status);
  }

  async getGameStatus(roomId, gameId) {
    return await prs.getRoomGameParam(roomId, gameId, this.storageKeys.status);
  }

  async setNewRound(roomId, gameId) {
    const round = await prs.getNextInt(`room_${roomId}_game_${gameId}_round`);
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.round, round);
    return round;
  }

  async getRound(roomId, gameId) {
    return await prs.getRoomGameParam(roomId, gameId, this.storageKeys.round);
  }

  async getNextTeamId(roomId, gameId) {
    const previousTeamId = await prs.getRoomGameParam(roomId, gameId, this.storageKeys.currentMoveTeamId, null);

    const teams = await roomService.getTeams(roomId);

    if (previousTeamId === null) {
      return  teams[0].teamId;
    }

    const currIndex = teams.findIndex(element => { return element.teamId === previousTeamId });

    if (currIndex === teams.length) {
      return teams[0].teamId;
    }

    return teams[currIndex + 1];
  }

  async setCurrentTeamId(roomId, gameId, teamId) {
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.currentMoveTeamId, teamId);
  }

  async getCurrentTeamId(roomId, gameId, teamId) {
    return await prs.getRoomGameParam(roomId, gameId, this.storageKeys.currentMoveTeamId, teamId);
  }

  async getTeamRoles(roomId, gameId, teamId) {
    const team = await roomService.getTeam(roomId, teamId);
  }
}

export default new GameService();