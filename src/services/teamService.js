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

  async getNewTeam(roomId) {
    const teamName = await this.getRandomTeamName(roomId);
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
        team.members.splice(team.members.indexOf(userId), 1);
      }
    })
    await prs.setRoomParam(roomId, 'teams', teams);
  }

  async getMyTeam(roomId, userId) {
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    return this.findMyTeam(teams, userId);
  }

  findMyTeam (teams, userId) {
    const myTeam = null;
  
    teams.forEach(team => {
      console.log(team.members, id, team.members.includes(userId))
      if (team.members.includes(userId)) {
        myTeam = team.teamId;
      }
    });
  
    return myTeam;
  }
}

export { TeamService };