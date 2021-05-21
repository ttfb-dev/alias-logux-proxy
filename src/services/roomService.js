import { prs, logger } from '../libs/index.js';
import { ErrorResponse } from '../contracts/index.js';

class RoomService {
    commandService;

    constructor () {
        this.commandService = new CommandService();
    }

    async whereIAm(userId) {
        return await prs.getUserParam(userId, 'room_in', null);
    }

    async joinRoom(userId, roomId) {
        // если уже присоеденены к какой-либо комнате
        const currentRoomId = await this.whereIAm(userId);
        if (currentRoomId) {
            return new ErrorResponse('user_already_in_room', 'Вы уже присоеденены к комнате {room_id}', {room_id: currentRoomId});
        }

        // проверяем статус комнаты
        const isRoomActive = (await prs.getRoomParam(roomId, 'status')) === 'active';
        if (!isRoomActive) {
            return new ErrorResponse('room_does_not_exist_or_closed', 'Комната, к которой вы пытаетесь присоединиться не существует или закрыта');
        }

        const roomMembers = prs.getRoomParam(roomId, 'members', []);
        roomMembers.push(userId);
        await prs.setRoomParam(roomId, 'members', roomMembers);
        await prs.setUserParam(userId, 'room_in', roomId);

        return true;
    }

    async leaveRoom(userId, roomId) {
        const currentRoomId = await this.whereIAm(userId);

        if (parseInt(roomId) !== currentRoomId) {
            return new ErrorResponse('user_in_another_room', 'Вы присоеденены к другой комнате {room_id}', {room_id: currentRoomId});
        }

        const roomMembers = prs.getRoomParam(roomId, 'members', []);
        console.log(roomMembers);
        if (roomMembers.includes(userId)) {
            roomMembers.splice(roomMembers.indexOf(userId), 1);
        }
        await prs.setRoomParam(roomId, 'members', roomMembers);
        await prs.delUserParam(userId, 'room_in');

        return true;
    }

    async createRoom(userId) {
        const currentRoomId = await this.whereIAm(userId)
        if (currentRoomId) {
            return new ErrorResponse('user_already_in_room', 'Вы уже присоеденены к комнате {room_id}', {room_id: currentRoomId});
        }

        const roomId = await prs.getNextInt('room_id');

        await prs.setRoomParam(roomId, 'status', 'active');
        await prs.setRoomParam(roomId, 'owner', userId);
        await prs.setRoomParam(roomId, 'members', [userId]);
        await prs.setUserParam(userId, 'room_in', roomId);

        await this.commandService.initCommands(roomId);

        return roomId;
    }
};

class CommandService {
    async initCommands(roomId) {

    }
};

export { RoomService, CommandService };
