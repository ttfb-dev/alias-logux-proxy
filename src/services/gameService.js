import ErrorResponse from '../contracts/index.js';
import { prs, logger } from '../libs/index.js';
import { room } from '../modules/room.js';

import { RoomService } from './roomService.js';
const roomService = new RoomService();

class GameService {
  async canStartGame(roomId) {
    const room = await roomService.getRoom(roomId);

    const teams = room.teams;

    let notEmptyTeamsCounter = 0;

    // В каждой команде минимум по 2 игрока
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];

      if (team.memberIds.length === 1) {
        throw new ErrorResponse('not_enouth_teammates_in_team', `Недостаточно игроков в комнате ${team.name}`, {team});
      }

      if (team.memberIds.length) {
        notEmptyTeamsCounter += 1;
      }
    }

    // Есть хотя бы 2 команды с пользователями
    if (notEmptyTeamsCounter < 2) {
      throw new ErrorResponse('not_enouth_teams_with_members', 'Недостаточно команд с игроками');
    }

    // Есть хотя бы один включенный набор слов
    const activeDatasetIds = await roomService.getRoomActiveGameDatasetIds(roomId);

    if (activeDatasetIds.length === 0) {
      throw new ErrorResponse('not_enouth_word_datasets', 'Не выбрано ни одного набора слов');
    }

    return true;
  }

  async getRoomGameId(roomId) {
    return await prs.getRoomParam(roomId, 'current_game_id', null);
  }

  async isRoomInGame(roomId) {
    const roomStatus = await roomService.getRoomStatus(roomId);
    return roomStatus === 'game';
  }

  async startGame(roomId) {
    await roomService.setRoomStatus(roomId, 'game');
    const gameId = await prs.getNextInt(`room_${room_id}_game_id`);
    await prs.setRoomParam(roomId, 'current_game_id', gameId);

    await logger.info('game started', {roomId, gameId});
  }
}

export { GameService };