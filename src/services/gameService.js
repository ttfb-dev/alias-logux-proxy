import { prs, logger } from '../libs/index.js';

import { RoomService } from './roomService.js';
const roomService = new RoomService();

class GameService {
  async startGame(roomId) {
    await roomService.setRoomStatus(roomId, 'game');
    const gameId = await prs.getNextInt(`room_${room_id}_game_id`);
    await prs.setRoomParam(roomId, 'last_game_id', gameId);
  }
}

export { GameService };