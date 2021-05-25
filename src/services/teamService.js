import { prs, logger } from '../libs/index.js';

class TeamService {
    // генерирует пустую команду со случайным неповторяющимся названием
    async getRandomTeamName(roomId) {
        let tryLeft = 50;
        const teams = prs.getRoomParam(roomId, 'teams', []);
        console.log(teams);
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
        const teamAName = await this.getRandomTeamName(roomId);
        const teamBName = await this.getRandomTeamName(roomId);
        return [
            {
                name: teamAName,
                members: [],
            },
            {
                name: teamBName,
                members: [],
            },
        ];
    }
}

export { TeamService };