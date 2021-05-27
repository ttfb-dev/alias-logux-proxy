import { prs, logger } from '../libs/index.js';
import { WordService } from './wordService.js';
const wordService = new WordService();

class TeamService {
  // генерирует пустую команду со случайным неповторяющимся названием
  async getUniqueRandomTeamName(roomId, lang = 'ru') {
    let tryLeft = 50;
    const teams = await prs.getRoomParam(roomId, 'teams', []);
    const teamNames = teams.map((team) => {
      if (team.hasOwnProperty('name')) {
        return team.name;
      }
    })
    
    const allTeamNames = await wordService.getTeamNames(lang);
    
    while (tryLeft > 0) {
      const randomName = allTeamNames[Math.floor(Math.random() * allTeamNames.length)];

      if (!teamNames.includes(randomName)) {
        return randomName;
      }
      tryLeft =- 1;
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
    console.log(`getNewTeam ${roomId}, ${lang}, ${customTeamName}`)
    const teamName = customTeamName || await this.getUniqueRandomTeamName(roomId, lang);
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