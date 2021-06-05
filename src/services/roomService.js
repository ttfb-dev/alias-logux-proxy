import { prs } from '../libs/index.js';
import { ErrorResponse } from '../contracts/index.js';

import { gameService, profileService, teamService, wordService } from './index.js';

class RoomService {

  constructor() {
    this.storageKeys = {
      roomId: 'room_in',
      ownerId: 'owner_id',
      memberIds: 'member_ids',
      statuses: {
        lobby: 'pregame',
        game: 'game',
        closed: 'closed',
      }
    };
  }

  async whereIAm(userId) {
    return await prs.getUserParam(userId, this.storageKeys.roomId, null);
  }

  async isItMyRoomId(userId, roomId) {
    const myRoomId = await this.whereIAm(userId);
    return myRoomId === roomId;
  }

  async amIRoomOwner(userId, roomId) {
    const ownerId = await prs.getRoomParam(roomId, this.storageKeys.ownerId, null);
    return userId === ownerId
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
    const isRoomActive = roomStatus === this.storageKeys.statuses.lobby;
    if (!isRoomActive) {
      return new ErrorResponse(
        'room_does_not_exist_or_closed',
        'Комната, к которой вы пытаетесь присоединиться не существует или закрыта',
      );
    }

    const roomMemberIds = await prs.getRoomParam(roomId, this.storageKeys.memberIds, []);
    if (!roomMemberIds.includes(userId)) {
      roomMemberIds.push(userId);
      await prs.setRoomParam(roomId, this.storageKeys.memberIds, roomMemberIds);
    }
    await prs.setUserParam(userId, this.storageKeys.roomId, roomId);

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

    const roomMemberIds = await prs.getRoomParam(roomId, this.storageKeys.memberIds, []);
    if (roomMemberIds.includes(userId)) {
      roomMemberIds.splice(roomMemberIds.indexOf(userId), 1);
    }
    await prs.setRoomParam(roomId, this.storageKeys.memberIds, roomMemberIds);
    await prs.delUserParam(userId, this.storageKeys.roomId);

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

    const roomName = await wordService.getRandomRoomName('ru');

    const teams = await teamService.getTwoTeams(roomId);

    await prs.setRoomParam(roomId, 'status', this.storageKeys.statuses.lobby);
    await prs.setRoomParam(roomId, this.storageKeys.ownerId, userId);
    await prs.setRoomParam(roomId, this.storageKeys.memberIds, [userId]);
    await prs.setRoomParam(roomId, 'teams', teams);
    await prs.setRoomParam(roomId, 'settings', {
      name: roomName,
      lang: 'ru',
    });
    await prs.setUserParam(userId, this.storageKeys.roomId, roomId);

    await this.refreshRoomDatasets(roomId, true);

    return roomId;
  }

  async setRoomInGame(roomId) {
    return await this.setRoomStatus(roomId, this.storageKeys.statuses.game)
  }

  async setRoomStatus(roomId, status) {
    if (!this.storageKeys.statuses.hasOwnProperty(status)) {
      return false;
    }

    await prs.setRoomParam(roomId, 'status', status);
  }

  async renameRoom(roomId, customRoomName) {
    let roomName = customRoomName;
    if (!customRoomName) {
      const settings = await prs.getRoomParam(roomId, 'settings', {});
      roomName = await wordService.getRandomRoomName(settings.lang);
    }

    const settings = await prs.getRoomParam(roomId, 'settings', {});
    settings.name = roomName;
    await prs.setRoomParam(roomId, 'settings', settings);

    return settings;
  }

  async getRoom(roomId) {
    return {
      roomId:           roomId,
      status:           await prs.getRoomParam(roomId, 'status', 'not_found'),
      ownerId:          await prs.getRoomParam(roomId, this.storageKeys.ownerId, null),
      memberIds:        await prs.getRoomParam(roomId, this.storageKeys.memberIds, []),
      teams:            await prs.getRoomParam(roomId, 'teams', []),
      settings:         await prs.getRoomParam(roomId, 'settings', {}),
      gameWordDatasets: await this.getRoomGameDatasets(roomId),
      currentGameId:    await gameService.getRoomGameId(roomId),
    };
  }

  async getRoomDetail(roomId, userId) {
    const room = await this.getRoom(roomId);

    room.myTeamId = teamService.findMyTeam(room.teams, userId);

    return room;
  }

  async getRoomStatus(roomId) {
    return await prs.getRoomParam(roomId, 'status', 'not_found');
  }

  async createTeam(roomId, teamName) {
    const settings = await prs.getRoomParam(roomId, 'settings', {});

    const teams = await prs.getRoomParam(roomId, 'teams', []);
    const newTeam = await teamService.getNewTeam(roomId, settings.lang, teamName);

    teams.push(newTeam);

    await prs.setRoomParam(roomId, 'teams', teams);

    return teams;
  }

  async isTeamEmpty(roomId, teamId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);

    let isEmpty = false;

    teams.forEach(team => {
      if (team.teamId === teamId) {
        isEmpty = team.memberIds.length === 0;
      }
    });

    return isEmpty;
  }

  async getTeamsCount(roomId) {
    const teams = await this.getTeams(roomId);
    return teams.length;
  }

  async getTeams(roomId) {
    return await prs.getRoomParam(roomId, 'teams', []);
  }

  async getTeam(roomId, teamId) {
    const teams = await this.getTeams(roomId);
    const filteredTeams = teams.filter(team => team.teamId === teamId)
    return filteredTeams.length ? filteredTeams[0] : null;
  }

  async deleteTeam(roomId, teamId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);

    const filteredTeams = teams.filter(team => team.teamId !== teamId)

    await prs.setRoomParam(roomId, 'teams', filteredTeams);

    return filteredTeams;
  }

  async renameTeam(roomId, teamId, customTeamName) {
    const settings = await prs.getRoomParam(roomId, 'settings', {});
    const teams = await prs.getRoomParam(roomId, 'teams', []);

    const teamName = customTeamName || await teamService.getUniqueRandomTeamName(roomId, settings.lang);

    teams.forEach(team => {
      if (team.teamId === teamId) {
        team.name = teamName;
      }
    })

    await prs.setRoomParam(roomId, 'teams', teams);

    return teams;
  }

  async getRoomActiveGameDatasetIds(roomId) {
    return await prs.getRoomParam(roomId, 'active_game_dataset_ids', []);
  }

  async activateGameDataset(roomId, datasetId) {
    const activeGameDatasetIds = await this.getRoomActiveGameDatasetIds(roomId);
    activeGameDatasetIds.push(datasetId);
    await prs.setRoomParam(roomId, 'active_game_dataset_ids', activeGameDatasetIds);
    return activeGameDatasetIds;
  }

  async deactivateGameDataset(roomId, datasetId) {
    const activeGameDatasetIds = await this.getRoomActiveGameDatasetIds(roomId);
    const filteredActiveGameDatasetIds = activeGameDatasetIds.filter(id => id !== datasetId);
    await prs.setRoomParam(roomId, 'active_game_dataset_ids', filteredActiveGameDatasetIds);
    return filteredActiveGameDatasetIds;
  }

  async getRoomPurchasedDatasetIds(roomId) {
    const memberIds = await prs.getRoomParam(roomId, this.storageKeys.memberIds, []);
    const purchasedDatasets = [];
    for(let i = 0; i < memberIds.length; i++) {
      const memberId = memberIds[i];
      const userPurchasedDatasets = await profileService.getPurchasedDatasetIds(memberId);
      purchasedDatasets.push(...userPurchasedDatasets);
    }
    return purchasedDatasets;
  }

  async refreshRoomDatasets(roomId, onRoomCreate = false) {
    const room = await this.getRoom(roomId);
    
    if (onRoomCreate) {
      const activeDatasetIds = await profileService.getActiveDatasetIds(room.ownerId);
      await prs.setRoomParam(roomId, 'active_game_dataset_ids', activeDatasetIds);
    }

    const purchasedDatasetIds = await this.getRoomPurchasedDatasetIds(roomId);

    await prs.setRoomParam(roomId, 'purchased_game_dataset_ids', purchasedDatasetIds);
  }

  async getRoomGameDatasets(roomId) {
    const lang = await this.getRoomLang(roomId);
    const datasets = await wordService.getLangGameDatasets(lang);
    const activeGameDatasetIds = await this.getRoomActiveGameDatasetIds(roomId);
    const purchasedDatasetIds = await this.getRoomPurchasedDatasetIds(roomId);

    return profileService.mapDatasetsWithStatus(activeGameDatasetIds, purchasedDatasetIds, datasets);
  }

  async isDatasetAvailable(roomId, datasetId) {
    const datasets = await this.getRoomGameDatasets(roomId);
    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i]
      if (dataset.datasetId === datasetId) {
        return ['active', 'inactive'].includes(dataset.status)
      }
    }
    return false;
  }

  async isDatasetAvailableToActivate(roomId, datasetId) {
    const datasets = await this.getRoomGameDatasets(roomId);
    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i]
      if (dataset.datasetId === datasetId) {
        console.log(dataset.status)
        return dataset.status === 'inactive';
      }
    }
    return false;
  }

  async isDatasetAvailableToDeactivate(roomId, datasetId) {
    const datasets = await this.getRoomGameDatasets(roomId);
    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i]
      if (dataset.datasetId === datasetId) {
        return dataset.status === 'active';
      }
    }
    return false;
  }

  async getRoomLang(roomId) {
    const roomSettings = await prs.getRoomParam(roomId, 'settings', {lang: 'ru'});
    return roomSettings.lang;
  }
}

export default new RoomService();
