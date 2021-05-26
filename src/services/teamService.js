import { prs, logger } from '../libs/index.js';

class TeamService {
  // генерирует пустую команду со случайным неповторяющимся названием
  async getRandomTeamName(roomId) {
    let tryLeft = 50;
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    const teamNames = teams.map((team) => {
      if (team.hasOwnProperty('name')) {
        return team.name;
      }
    })
    const availableTeamNamesString = await prs.getAppParam('word_dataset_ru_teams');
    const availableTeamNames = availableTeamNamesString.split(',');
    while (tryLeft > 0) {
      const randomName = availableTeamNames[Math.floor(Math.random() * availableTeamNames.length)];

      if (!teamNames.includes(randomName)) {
        return randomName;
      }
      tryLeft =- 1;
    }
    return availableTeamNames[Math.floor(Math.random() * availableTeamNames.length)];
  }

  async getTwoTeams(roomId) {
    return [
      await this.getNewTeam(roomId),
      await this.getNewTeam(roomId),
    ];
  }

  async getNewTeam(roomId, customTeamName = null) {
    const teamName = customTeamName || await this.getRandomTeamName(roomId);
    const teamId = await prs.getNextInt(`room_${roomId}_teams`, 0);
    return {
      teamId: teamId,
      name: teamName,
      members: [],
    }
  }

  async joinTeam(roomId, teamId, userId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    teams.forEach((team) => {
      if (team.teamId === teamId) {
        team.members.push(userId);
      }
    })
    await prs.setRoomParam(roomId, 'teams', teams);
  }

  async leaveTeam(roomId, userId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    teams.forEach((team) => {
      if (team.members.includes(userId)) {
        team.members = team.members.filter(uid => uid !== userId);
      }
    })
    await prs.setRoomParam(roomId, 'teams', teams);
  }

  async getMyTeam(roomId, userId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    return this.findMyTeam(teams, userId);
  }

  findMyTeam (teams, userId) {
    let myTeam = null;

    teams.forEach(team => {
      if (team.members.includes(userId)) {
        myTeam = team.teamId;
      }
    });
  
    return myTeam;
  }
}

export { TeamService };