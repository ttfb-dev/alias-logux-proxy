import { customAlphabet } from 'nanoid';

import { ErrorResponse } from '../contracts';
import { gdatasets, isDev, prs, roomLib, udatasets, vkapi } from '../libs';

import { flags } from './wordService';
import { gameService, profileService, teamService, wordService } from '.';

const nanoid = customAlphabet('1234567890abcdef', 10);

class RoomService {
  constructor() {
    this.storageKeys = {
      roomId: 'room_in',
      ownerId: 'owner_id',
      memberIds: 'member_ids',
      statuses: {
        lobby: 'lobby',
        game: 'game',
        closed: 'closed',
      },
    };
  }

  async whereIAm(userId) {
    return await prs.getUserParam(userId, this.storageKeys.roomId, null);
  }

  async isRoomInGame(roomId) {
    const roomStatus = await this.getRoomStatus(roomId);
    return roomStatus === this.storageKeys.statuses.game;
  }

  async isItMyRoomId(userId, roomId) {
    const myRoomId = await this.whereIAm(userId);
    return myRoomId === roomId;
  }

  async amIRoomOwner(userId, roomId) {
    const ownerId = await prs.getRoomParam(
      roomId,
      this.storageKeys.ownerId,
      null,
    );
    return userId === ownerId;
  }

  async isRoomActive(roomId) {
    const roomStatus = await prs.getRoomParam(roomId, 'status');
    return roomStatus === this.storageKeys.statuses.lobby;
  }

  async joinRoom(userId, roomId) {
    const roomMemberIds = await prs.getRoomParam(
      roomId,
      this.storageKeys.memberIds,
      [],
    );
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
      throw new ErrorResponse('user_not_in_room', 'Вы вне комнаты');
    }

    if (roomId !== currentRoomId) {
      throw new ErrorResponse(
        'user_in_another_room',
        `Вы находитесь в ${currentRoomId} комнате.`,
        { room_id: currentRoomId },
      );
    }

    const team = teamService.getTeamByUserId(roomId, userId);
    if (team) {
      await teamService.leaveTeam(roomId, userId);
    }

    const roomMemberIds = await prs.getRoomParam(
      roomId,
      this.storageKeys.memberIds,
      [],
    );
    if (roomMemberIds.includes(userId)) {
      roomMemberIds.splice(roomMemberIds.indexOf(userId), 1);
      await prs.setRoomParam(roomId, this.storageKeys.memberIds, roomMemberIds);
    }
    await prs.delUserParam(userId, this.storageKeys.roomId);

    return true;
  }

  async createRoom(userId) {
    const roomId = nanoid();

    const roomName = await wordService.getRandomRoomName();

    const teams = await teamService.getTwoTeams(roomId);

    await prs.setRoomParam(roomId, 'status', this.storageKeys.statuses.lobby);
    await prs.setRoomParam(roomId, this.storageKeys.ownerId, userId);
    await prs.setRoomParam(roomId, this.storageKeys.memberIds, [userId]);
    await prs.setRoomParam(roomId, 'teams', teams);
    const settings = await roomLib.getDefaultSettings(roomId);
    settings.name = roomName;
    await roomLib.setSettings(roomId, settings);
    await prs.setUserParam(userId, this.storageKeys.roomId, roomId);

    await this.refreshRoomDatasets(roomId, true);

    return roomId;
  }

  async updateSettings(roomId, settings) {
    await roomLib.setSettings(roomId, settings);
  }

  async setRoomInGame(roomId) {
    return await this.setRoomStatus(roomId, this.storageKeys.statuses.game);
  }

  async setRoomStatus(roomId, status) {
    if (!this.storageKeys.statuses.hasOwnProperty(status)) {
      return false;
    }

    await prs.setRoomParam(roomId, 'status', status);
  }

  async renameRoom(roomId, customRoomName) {
    let roomName = customRoomName;
    const settings = await roomLib.getSettings(roomId);

    if (!customRoomName) {
      roomName = await wordService.getRandomRoomName();
    }

    settings.name = roomName;
    await roomLib.setSettings(roomId, settings);

    return settings;
  }

  async getRoom(roomId) {
    return {
      roomId: roomId,
      status: await prs.getRoomParam(roomId, 'status', 'not_found'),
      ownerId: await prs.getRoomParam(roomId, this.storageKeys.ownerId, null),
      memberIds: await prs.getRoomParam(roomId, this.storageKeys.memberIds, []),
      members: await this.getMembers(roomId),
      teams: await prs.getRoomParam(roomId, 'teams', []),
      settings: await roomLib.getSettings(roomId),
      gameWordDatasets: await this.getRoomGameDatasets(roomId),
      currentGameId: await gameService.getRoomGameId(roomId),
    };
  }

  async getMembers(roomId) {
    const memberIds = await this.getMemberIds(roomId);
    return await vkapi.getUsers(memberIds);
  }

  async getMemberIds(roomId) {
    return await prs.getRoomParam(roomId, this.storageKeys.memberIds, []);
  }

  async getRoomDetail(roomId, userId) {
    const room = await this.getRoom(roomId);

    room.myTeamId = teamService.findMyTeam(room.teams, userId);

    delete room.memberIds;

    return room;
  }

  async getRoomStatus(roomId) {
    return await prs.getRoomParam(roomId, 'status', 'not_found');
  }

  async createTeam(roomId, teamName) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    const newTeam = await teamService.getNewTeam(roomId, teamName);

    teams.push(newTeam);

    await prs.setRoomParam(roomId, 'teams', teams);

    return teams;
  }

  async isTeamEmpty(roomId, teamId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);

    let isEmpty = false;

    teams.forEach((team) => {
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
    const filteredTeams = teams.filter((team) => team.teamId === teamId);
    return filteredTeams.length ? filteredTeams[0] : null;
  }

  async deleteTeam(roomId, teamId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);

    const filteredTeams = teams.filter((team) => team.teamId !== teamId);

    await prs.setRoomParam(roomId, 'teams', filteredTeams);

    return filteredTeams;
  }

  async renameTeam(roomId, teamId, customTeamName) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);

    const teamName =
      customTeamName || (await teamService.getUniqueRandomTeamName(roomId));

    teams.forEach((team) => {
      if (team.teamId === teamId) {
        team.name = teamName;
      }
    });

    await prs.setRoomParam(roomId, 'teams', teams);

    return teams;
  }

  async activateGameDataset(roomId, datasetId) {
    return await gdatasets.activate(roomId, datasetId);
  }

  async deactivateGameDataset(roomId, datasetId) {
    return await gdatasets.deactivate(roomId, datasetId);
  }

  async getRoomPurchasedDatasetIds(roomId) {
    const memberIds = await prs.getRoomParam(
      roomId,
      this.storageKeys.memberIds,
      [],
    );
    const purchasedDatasets = [];
    for (let i = 0; i < memberIds.length; i++) {
      const memberId = memberIds[i];
      const userPurchasedDatasets = await profileService.getPurchasedDatasetIds(
        memberId,
      );
      purchasedDatasets.push(...userPurchasedDatasets);
    }
    return purchasedDatasets;
  }

  async refreshRoomDatasets(roomId, onRoomCreate = false) {
    if (onRoomCreate) {
      const room = await this.getRoom(roomId);
      const activeDatasetIds = await profileService.getActiveDatasetIds(
        room.ownerId,
      );
      if (activeDatasetIds) {
        for (const datasetId of activeDatasetIds) {
          await this.activateGameDataset(roomId, datasetId);
        }
      }
    }

    const purchasedDatasetIds = await this.getRoomPurchasedDatasetIds(roomId);

    await prs.setRoomParam(
      roomId,
      'purchased_game_dataset_ids',
      purchasedDatasetIds,
    );
  }

  async getRoomGameDatasets(roomId) {
    const datasets = await wordService.getGameDatasets();
    const activeGameDatasetIds = await gdatasets.getActive(roomId);
    const memberIds = await prs.getRoomParam(
      roomId,
      this.storageKeys.memberIds,
      [],
    );

    const localFlags = { ...flags };

    const fixedIdsMap = [];

    for (const userId of memberIds) {
      if (
        !localFlags.isJoinedGroup &&
        (await profileService.isJoinedGroup(userId))
      ) {
        localFlags.isJoinedGroup = true;
      }
      if (!localFlags.isDonut && (await profileService.isDonut(userId))) {
        localFlags.isDonut = true;
      }

      const userFixedIds = udatasets.getFixed(userId);

      console.log({ userId, userFixedIds });

      if (userFixedIds.length) {
        fixedIdsMap.push(...userFixedIds);
      }
    }

    console.log({ fixedIdsMap });

    const fixedIds = fixedIdsMap.filter((v, i, a) => a.indexOf(v) === i);

    console.log({ fixedIds });

    return profileService.mapDatasetsWithStatus(
      activeGameDatasetIds,
      fixedIds,
      localFlags,
      datasets,
    );
  }

  async isDatasetAvailable(roomId, datasetId) {
    const datasets = await this.getRoomGameDatasets(roomId);
    for (let i = 0; i < datasets.length; i++) {
      const dataset = datasets[i];
      if (dataset.datasetId === datasetId) {
        return ['active', 'inactive'].includes(dataset.status);
      }
    }
    return false;
  }

  async isDatasetAvailableToActivate(roomId, datasetId) {
    const datasets = await this.getRoomGameDatasets(roomId);
    const dataset = datasets.find((dataset) => dataset.datasetId === datasetId);

    if (dataset) {
      return dataset.status === 'inactive';
    }

    return false;
  }

  async isDatasetAvailableToDeactivate(roomId, datasetId) {
    const datasets = await this.getRoomGameDatasets(roomId);
    const dataset = datasets.find((dataset) => dataset.datasetId === datasetId);

    if (dataset) {
      return dataset.status === 'active';
    }

    return false;
  }

  async isDatasetAvailableToToggle(roomId, datasetId) {
    const datasets = await this.getRoomGameDatasets(roomId);
    const dataset = datasets.find((dataset) => dataset.datasetId === datasetId);

    if (dataset) {
      return ['active', 'inactive'].includes(dataset.status);
    }

    return false;
  }

  async getDatasetStatus(roomId, datasetId) {
    const datasets = await this.getRoomGameDatasets(roomId);
    const dataset = datasets.find((dataset) => dataset.datasetId === datasetId);

    if (dataset) {
      return dataset.status;
    }

    return false;
  }
}

export default new RoomService();
