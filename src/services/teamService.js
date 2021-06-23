import { prs } from '../libs';

import { wordService } from '.';

class TeamService {
  // генерирует пустую команду со случайным неповторяющимся названием
  async getUniqueRandomTeamName(roomId, lang = 'ru') {
    let tryLeft = 50;
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    const teamNames = teams.map((team) => {
      if (team.hasOwnProperty('name')) {
        return team.name;
      }
    });

    const allTeamNames = await wordService.getTeamNames(lang);

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

  async getTwoTeams(roomId, lang = 'ru') {
    return [
      await this.getNewTeam(roomId, lang),
      await this.getNewTeam(roomId, lang),
    ];
  }

  async getNewTeam(roomId, lang = 'ru', customTeamName = null) {
    const teamName =
      customTeamName || (await this.getUniqueRandomTeamName(roomId, lang));
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
