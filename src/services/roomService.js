import { prs, logger } from '../libs/index.js';
import { ErrorResponse } from '../contracts/index.js';
import { TeamService } from './teamService.js';
 
class RoomService {
  teamService;

  constructor() {
    this.teamService = new TeamService();
  }

  async whereIAm(userId) {
    return await prs.getUserParam(userId, 'room_in', null);
  }

  async joinRoom(userId, roomId) {
    // если уже присоеденены к какой-либо комнате
    const currentRoomId = await this.whereIAm(userId);
    if (currentRoomId) {
      return new ErrorResponse(
        'user_already_in_room',
        'Вы уже присоеденены к комнате {room_id}',
        { room_id: currentRoomId },
      );
    }

    // проверяем статус комнаты
    const roomStatus = await prs.getRoomParam(roomId, 'status');
    const isRoomActive = roomStatus === 'active';
    if (!isRoomActive) {
      return new ErrorResponse(
        'room_does_not_exist_or_closed',
        'Комната, к которой вы пытаетесь присоединиться не существует или закрыта',
      );
    }

    const roomMembers = await prs.getRoomParam(roomId, 'members', []);
    if (!roomMembers.includes(userId)) {
      roomMembers.push(userId);
      await prs.setRoomParam(roomId, 'members', roomMembers);
    }
    await prs.setUserParam(userId, 'room_in', roomId);

    return true;
  }

  async leaveRoom(userId, roomId) {
    const currentRoomId = await this.whereIAm(userId);
    if (!currentRoomId) {
      return new ErrorResponse('user_not_in_room', 'Вы вне комнаты');
    }

    if (parseInt(roomId) !== currentRoomId) {
      return new ErrorResponse(
        'user_in_another_room',
        'Вы присоеденены к другой комнате {room_id}',
        { room_id: currentRoomId },
      );
    }

    const roomMembers = await prs.getRoomParam(roomId, 'members', []);
    if (roomMembers.includes(userId)) {
      roomMembers.splice(roomMembers.indexOf(userId), 1);
    }
    await prs.setRoomParam(roomId, 'members', roomMembers);
    await prs.delUserParam(userId, 'room_in');

    return true;
  }

  async createRoom(userId) {
    const currentRoomId = await this.whereIAm(userId);
    if (currentRoomId) {
      return new ErrorResponse(
        'user_already_in_room',
        'Вы уже присоеденены к комнате {room_id}',
        { room_id: currentRoomId },
      );
    }

    const roomId = await prs.getNextInt('room_id');

    const roomName = await getRandomRoomName();

    const teams = await this.teamService.getTwoTeams(roomId);
    сonsole.log(teams);

    await prs.setRoomParam(roomId, 'status', 'active');
    await prs.setRoomParam(roomId, 'owner', userId);
    await prs.setRoomParam(roomId, 'members', [userId]);
    await prs.setRoomParam(roomId, 'teams', teams);
    await prs.setRoomParam(roomId, 'settings', {name: roomName});
    // await prs.setRoomParam(roomId, 'wordsets', []);
    await prs.setUserParam(userId, 'room_in', roomId);

    await this.teamService.initTeams(roomId);

    return roomId;
  }

  async getRoomDetail(roomId) {
    return {
      status:   await prs.getRoomParam(roomId, 'status', 'not_found'),
      owner:    await prs.getRoomParam(roomId, 'owner', null),
      members:  await prs.getRoomParam(roomId, 'members', []),
      teams:    await prs.getRoomParam(roomId, 'teams', []),
      settings: await prs.getRoomParam(roomId, 'settings', {}),
    }
  }
}

const getRandomRoomName = async () => {
  const lng = 'ru';
  const type = 'rooms';
  const namesString = await prs.getAppParam(`word_dataset_${lng}_${type}`);
  const names = namesString.split(',');
  return names[Math.floor(Math.random() * names.length)];
}

export { RoomService };
