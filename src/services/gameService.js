import { prs, logger } from '../libs/index.js';

import { roomService } from './index.js';

const SCREEN__BETWEEN_MOVES = 'between_moves'

const storageKeys = {
  currentGameId: 'current_game_id',
  currentMoveTeamId: 'current_move_team_id',
  round: 'round',
  screen: 'screen',
};

class GameService {
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
    return await prs.getRoomParam(roomId, storageKeys.currentGameId, null);
  }

  async isRoomInGame(roomId) {
    const roomStatus = await roomService.getRoomStatus(roomId);
    return roomStatus === 'game';
  }

  async getGame(roomId, gameId) {
    return {
      roomId: roomId,
      gameId: gameId,
      screen: await this.getGameScreen(roomId, gameId),
      round: await this.getRound(roomId, gameId),
      currentTeamId: await this.getCurrentTeamId(roomId, gameId),
    };
  }

  async startGame(roomId) {
    await roomService.setRoomStatus(roomId, 'game');
    const gameId = await prs.getNextInt(`room_${room_id}_game_id`);
    await prs.setRoomParam(roomId, storageKeys.currentGameId, gameId);

    await this.setGameScreen(roomId, gameId, SCREEN__BETWEEN_MOVES);

    const currentTeamId = await this.getNextTeamId(roomId, gameId);
    await this.setNextTeamId(roomId, gameId, currentTeamId);

    await this.setNewRound(roomId, gameId);
  }

  async setGameScreen(roomId, gameId, screen) {
    await prs.setRoomGameParam(roomId, gameId, storageKeys.screen, screen);
  }

  async getGameScreen(roomId, gameId) {
    return await prs.getRoomGameParam(roomId, gameId, storageKeys.screen);
  }

  async setNewRound(roomId, gameId) {
    const round = await prs.getNextInt(`room_${roomId}_game_${gameId}_round`);
    await prs.setRoomGameParam(roomId, gameId, storageKeys.round, round);
    return round;
  }

  async getRound(roomId, gameId) {
    return await prs.getRoomGameParam(roomId, gameId, storageKeys.round);
  }

  async getNextTeamId(roomId, gameId) {
    const previousTeamId = await prs.getRoomGameParam(roomId, gameId, storageKeys.currentMoveTeamId, null);

    if (previousTeamId === null) {
      return  teams[0].id;
    }

    const teams = await roomService.getTeams(roomId);

    const currIndex = teams.findIndex(element => { return element.id === previousTeamId });

    if (currIndex === teams.length) {
      return teams[0].id;
    }

    return teams[currIndex + 1];
  }

  async setCurrentTeamId(roomId, gameId, teamId) {
    await prs.setRoomGameParam(roomId, gameId, storageKeys.currentMoveTeamId, teamId);
  }

  async getCurrentTeamId(roomId, gameId, teamId) {
    return await prs.getRoomGameParam(roomId, gameId, storageKeys.currentMoveTeamId, teamId);
  }

  async getTeamRoles(roomId, gameId, teamId) {
    const team = await roomService.getTeam(roomId, teamId);
  }
}

export default new GameService();