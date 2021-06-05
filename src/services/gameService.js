import { prs, logger } from '../libs/index.js';

import { roomService, wordService } from './index.js';

class GameService {

  constructor() {
    this.storageKeys = {
      currentGameId: 'current_game_id',
      currentMoveTeamId: 'current_move_team_id',
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
    return {
      status: await this.getGameStatus(roomId, gameId),
      round:  await prs.getRoomGameParam(roomId, gameId, this.storageKeys.round, 1),
      step:   {
        stepId: await prs.getRoomGameParam(roomId, gameId, this.storageKeys.step, 1),
        words: await this.getStepWords(roomId, gameId),
      },
    };
  }

  async startGame(roomId) {
    await roomService.setRoomInGame(roomId);
    const gameId = await prs.getNextInt(`room_${roomId}_game_id`);
    await prs.setRoomParam(roomId, this.storageKeys.currentGameId, gameId);

    await this.setGameStatus(roomId, gameId, this.storageKeys.statuses.lobby);

    // const currentTeamId = await this.getNextTeamId(roomId, gameId);
    // await this.setCurrentTeamId(roomId, gameId, currentTeamId);

    // await this.setNewRound(roomId, gameId);

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

  async getStepWords(roomId, gameId) {
    const datasets = await roomService.getRoomGameDatasets(roomId);
    return await this.getGameWords(roomId, gameId, datasets, 20);
  }

  async setNewRound(roomId, gameId) {
    const round = await prs.getNextInt(`room_${roomId}_game_${gameId}_round`);
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.round, round);
    return round;
  }

  async getRound(roomId, gameId) {
    return await prs.getRoomGameParam(roomId, gameId, this.storageKeys.round);
  }

  async getGameWords(roomId, gameId, datasets, limit) {
    let attempts = 0;
    const attemptsLimit = 1000;
    const wordsCounters = datasets.map(dataset => dataset.counter);
    console.log(datasets);
    console.log(wordsCounters);
    const usedKeys = await prs.getRoomGameParam(roomId, gameId, 'game_used_keys_map', [])
    const result = [];
    while (result.length < limit) {
      const { randomDatasetIndex, randomDatasetWord } = this.getRandomNumbers(wordsCounters);
      const index = this.packWordIndex(randomDatasetIndex, randomDatasetWord);
      console.log({ randomDatasetIndex, randomDatasetWord, index });
      if (attempts < attemptsLimit) {
        if (usedKeys.includes(index)) {
          continue;
        }
      }
      const word = await wordService.getDatasetWord(datasets[randomDatasetIndex], randomDatasetWord);
      console.log(word);
      usedKeys.push(index);
      result.push({
        word: word,
        index: index,
        guessed: null,
      })
      attempts += 1;
    }
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
    console.log(wordsCounters);
    const randomDatasetIndex = Math.floor(Math.random() * wordsCounters.length);
    const randomDatasetWord = Math.floor(Math.random() * wordsCounters[randomDatasetIndex]);
    return { randomDatasetIndex, randomDatasetWord };
  }

  async setCurrentTeamId(roomId, gameId, teamId) {
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.currentMoveTeamId, teamId);
  }

  async getCurrentTeamId(roomId, gameId, teamId) {
    return await prs.getRoomGameParam(roomId, gameId, this.storageKeys.currentMoveTeamId, teamId);
  }
}

export default new GameService();