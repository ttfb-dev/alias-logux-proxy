import { prs } from '../libs';

import { wordService } from '.';

class TeamService {
  // генерирует пустую команду со случайным неповторяющимся названием
  async getUniqueRandomTeamName(roomId) {
    let tryLeft = 50;
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    const teamNames = teams.map((team) => {
      if (team.hasOwnProperty('name')) {
        return team.name;
      }
    });

    const allTeamNames = await wordService.getTeamNames();

    while (tryLeft > 0) {
      const randomName =
        allTeamNames[Math.floor(Math.random() * allTeamNames.length)];

      if (!teamNames.includes(randomName)) {
        return randomName;
      }
      tryLeft = -1;
    }

    return allTeamNames[Math.floor(Math.random() * allTeamNames.length)];
  }

  async getTwoTeams(roomId) {
    return [await this.getNewTeam(roomId), await this.getNewTeam(roomId)];
  }

  async getNewTeam(roomId, customTeamName = null) {
    const teamName =
      customTeamName || (await this.getUniqueRandomTeamName(roomId));
    const teamId = await prs.getNextInt(`room_${roomId}_teams`, 0);
    return {
      teamId: teamId,
      name: teamName,
      memberIds: [],
    };
  }

  async joinTeam(roomId, teamId, userId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    teams.forEach((team) => {
      if (team.teamId === teamId) {
        team.memberIds.push(userId);
      }
    });
    await prs.setRoomParam(roomId, 'teams', teams);

    return teams;
  }

  async leaveTeam(roomId, userId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    teams.forEach((team) => {
      if (team.memberIds.includes(userId)) {
        team.memberIds = team.memberIds.filter((uid) => uid !== userId);
      }
    });
    await prs.setRoomParam(roomId, 'teams', teams);

    return teams;
  }

  async changeTeam(roomId, teams) {
    await prs.setRoomParam(roomId, 'teams', teams);
  }

  async getTeamByUserId(roomId, userId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);

    return teams.find((team) => team.memberIds.includes(userId)) || {};
  }

  async getTeamById(roomId, teamId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);

    return teams.find((team) => team.teamId === teamId) || {};
  }

  async getTeamIdByUserId(roomId, userId) {
    const team = await this.getTeamByUserId(roomId, userId);

    return team.teamId;
  }

  async getMyTeam(roomId, userId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    return this.findMyTeam(teams, userId);
  }

  findMyTeam(teams, userId) {
    let myTeamId = null;

    teams.forEach((team) => {
      if (team.memberIds.includes(userId)) {
        myTeamId = team.teamId;
      }
    });

    return myTeamId;
  }
}

export default new TeamService();
