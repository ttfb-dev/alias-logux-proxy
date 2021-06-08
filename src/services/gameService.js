import { prs, logger } from '../libs/index.js';

import { roomService, wordService } from './index.js';

class GameService {

  constructor() {
    this.storageKeys = {
      currentGameId: 'current_game_id',
      currentMoveTeamId: 'current_move_team_id',
      currentMoveTeam: 'current_move_team',
      round: 'round',
      step: 'step',
      status: 'status',
      statuses: {
        lobby: 'lobby',
        step: 'step',
        step_review: 'step_review',
      },
    };
  }

  async canStartGame(roomId) {
    const room = await roomService.getRoom(roomId);

    const teams = room.teams;

    let notEmptyTeamsCounter = 0;

    // В каждой команде минимум по 2 игрока
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];

      if (team.memberIds.length === 1) {
        throw false;
      }

      if (team.memberIds.length) {
        notEmptyTeamsCounter += 1;
      }
    }

    // Есть хотя бы 2 команды с пользователями
    if (notEmptyTeamsCounter < 2) {
      throw false;
    }

    // Есть хотя бы один включенный набор слов
    const activeDatasetIds = await roomService.getRoomActiveGameDatasetIds(roomId);

    if (activeDatasetIds.length === 0) {
      throw false;
    }

    return true;
  }

  async getRoomGameId(roomId) {
    return await prs.getRoomParam(roomId, this.storageKeys.currentGameId, null);
  }

  async isRoomInGame(roomId) {
    const roomStatus = await roomService.getRoomStatus(roomId);
    return roomStatus === roomService.storageKeys.status.game;
  }

  async getGame(roomId, gameId) {
    const currentTeamMeta = await this.getCurrentTeam(roomId, gameId);
    return {
      status: await this.getGameStatus(roomId, gameId),
      roundNumber:  await prs.getRoomGameParam(roomId, gameId, this.storageKeys.round, 1),
      stepNumber: await prs.getRoomGameParam(roomId, gameId, this.storageKeys.step, 1),
      step: {
        words: await this.getStepWords(roomId, gameId),
        ... currentTeamMeta,
      },
    };
  }

  async startGame(roomId) {
    await roomService.setRoomInGame(roomId);
    const gameId = await prs.getNextInt(`room_${roomId}_game_id`);
    await prs.setRoomParam(roomId, this.storageKeys.currentGameId, gameId);

    await this.setGameStatus(roomId, gameId, this.storageKeys.statuses.lobby);

    await this.setFirstStepTeamParams(roomId, gameId);

    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.round, 1);
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.step, 1);

    return gameId;
  }

  async setGameStatus(roomId, gameId, status) {
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.status, status);
  }

  async getGameStatus(roomId, gameId) {
    return await prs.getRoomGameParam(roomId, gameId, this.storageKeys.status);
  }
  async getStepWords(roomId, gameId) {}

  async getRandomWords(roomId, gameId) {
    const datasets = await roomService.getRoomGameDatasets(roomId);
    const availableDatasets = datasets.filter(dataset => dataset.status === 'active');
    return await this.getGameWords(roomId, gameId, availableDatasets, 20);
  }

  async getRound(roomId, gameId) {
    return await prs.getRoomGameParam(roomId, gameId, this.storageKeys.round);
  }

  async getGameWords(roomId, gameId, datasets, limit) {
    let attempts = 0;
    const attemptsLimit = 50;
    const wordsCounters = datasets.map(dataset => dataset.counter);
    const usedKeys = await prs.getRoomGameParam(roomId, gameId, 'game_used_keys_map', [])
    const result = [];
    while (result.length < limit) {
      const { randomDatasetIndex, randomDatasetWord } = this.getRandomNumbers(wordsCounters);
      const index = this.packWordIndex(randomDatasetIndex, randomDatasetWord);
      console.log(`attempt: ${attempts}`);
      console.log(`used keys number: ${usedKeys.length}`);
      console.log(`index ${index} in used: ${usedKeys.includes(index)}`);
      if (attempts < attemptsLimit) {
        if (usedKeys.includes(index)) {
          attempts += 1;
          continue;
        }
      }
      const word = await wordService.getDatasetWord(datasets[randomDatasetIndex], randomDatasetWord);
      usedKeys.push(index);
      result.push({
        word: word,
        index: index,
        guessed: null,
      })
      attempts += 1;
    }
    await prs.setRoomGameParam(roomId, gameId, 'game_used_keys_map', usedKeys); //тут сохраним а потом вырежем неиспользованные
    return result;
  }

  packWordIndex(randomDatasetIndex, randomDatasetWord) {
    return (randomDatasetIndex * 100000) + randomDatasetWord;
  }

  unpackWordIndex(index) {
    return { randomDatasetIndex: parseInt(index / 100000), randomDatasetWord: parseInt(index % 100000) }
  }

  async getRandomWordsFromDataset(roomId, gameId, randomDataset, n) {
    const datasetWords = await wordService.getGameDataset(randomDataset);
    const loadedWords = await prs.getRoomGameParam(roomId, gameId, `played_out_words_dataset_${randomDataset.datasetId}`, []);

    const filteredDatasetWords = datasetWords.filter(word => !loadedWords.includes(word))

    if (filteredDatasetWords < n) {
      return filteredDatasetWords;
    }
  }

  getRandomNumbers(wordsCounters) {
    const randomDatasetIndex = Math.floor(Math.random() * wordsCounters.length);
    const randomDatasetWord = Math.floor(Math.random() * wordsCounters[randomDatasetIndex]);
    return { randomDatasetIndex, randomDatasetWord };
  }

  async getFirstTeamId(roomId) {
    const teams = await roomService.getTeams(roomId);
    return teams[0].teamId;
  }

  async setCurrentTeam(roomId, gameId, teamMeta) {
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.currentMoveTeam, teamMeta);
  }

  async getCurrentTeam(roomId, gameId) {
    return await prs.getRoomGameParam(roomId, gameId, this.storageKeys.currentMoveTeam);
  }

  async setFirstStepTeamParams(roomId, gameId) {
    const teamId = await this.getFirstTeamId(roomId, gameId);
    const team = await roomService.getTeam(roomId, teamId);

    const sortedMembers = team.memberIds;
    sortedMembers.sort();

    const teamMeta = { teamId: teamId, explainerId: sortedMembers[0], guesserId: sortedMembers[1] };

    console.log(`team meta`, teamMeta)

    await this.setCurrentTeam(roomId, gameId, teamMeta);
  }
}

export default new GameService();