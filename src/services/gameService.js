import { gdatasets, prs } from '../libs';

import { roomService, wordService } from '.';

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
      currentStepWords: 'current_step_words',
      stepHistory: 'step_history',
      gameRequestedWords: 'game_requested_words',
      gameUsedWords: 'game_requested_words',
      stepStartedAt: (round, step) => `round_${round}_step_${step}_started_at`,
      stepScore: (round, step) => `round_${round}_step_${step}_score`,
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
    if (notEmptyTeamsCounter < 1) {
      // Временно поставили для одной команды
      throw false;
    }

    // Есть хотя бы один включенный набор слов
    const activeDatasetIds = await gdatasets.getActive(roomId);

    if (activeDatasetIds.length === 0) {
      throw false;
    }

    return true;
  }

  async getRoomGameId(roomId) {
    return await prs.getRoomParam(roomId, this.storageKeys.currentGameId, null);
  }

  async getGame(roomId, gameId) {
    const { roundNumber, stepNumber } = await this.getGameStepAndRound(
      roomId,
      gameId,
    );
    return {
      status: await this.getGameStatus(roomId, gameId),
      roundNumber,
      stepNumber,
      step: await this.getCurrentStep(roomId, gameId),
      history: await this.getStepHistory(roomId, gameId),
    };
  }

  async setRoomGameRound(roomId, gameId, roundId) {
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.round, roundId);
  }

  async getRoomGameRound(roomId, gameId) {
    return await prs.getRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.round,
      1,
    );
  }

  async setRoomGameStep(roomId, gameId, stepId) {
    await prs.setRoomGameParam(roomId, gameId, this.storageKeys.step, stepId);
  }

  async getRoomGameStep(roomId, gameId) {
    return await prs.getRoomGameParam(roomId, gameId, this.storageKeys.step, 1);
  }

  async getGameStepAndRound(roomId, gameId) {
    return {
      roundNumber: await this.getRoomGameRound(roomId, gameId),
      stepNumber: await this.getRoomGameStep(roomId, gameId),
    };
  }

  async getCurrentStep(roomId, gameId) {
    const { roundNumber, stepNumber } = await this.getGameStepAndRound(
      roomId,
      gameId,
    );
    const currentTeamMeta = await this.getCurrentTeam(roomId, gameId);
    const startedAt = await this.getStepStartedAt(
      roomId,
      gameId,
      roundNumber,
      stepNumber,
    );
    const stepScore = await this.getStepScore(roomId, gameId);

    return {
      words: await this.getStepWords(roomId, gameId),
      ...currentTeamMeta,
      startedAt,
      score: stepScore,
    };
  }

  async setCurrentStep(roomId, gameId, roundNumber, stepNumber, step) {
    await this.setStepWords(roomId, gameId, step.words);
    await this.setCurrentTeam(
      roomId,
      gameId,
      step.teamId,
      step.explainerId,
      step.guesserId,
    ); // проставляем новых участников
    await this.setStepScore(roomId, gameId, step.score);
    await this.setStepStartedAt(
      roomId,
      gameId,
      roundNumber,
      stepNumber,
      step.startedAt,
    );
  }

  async pushStepHistory(roomId, gameId, step) {
    const stepHistory = await this.getStepHistory(roomId, gameId);
    stepHistory.push(step);
    await this.setStepHistory(roomId, gameId, stepHistory);
  }

  async getStepHistory(roomId, gameId) {
    return await prs.getRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.stepHistory,
      [],
    );
  }

  async setStepHistory(roomId, gameId, stepHistory) {
    await prs.setRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.stepHistory,
      stepHistory,
    );
  }

  async getStepScore(roomId, gameId) {
    const { roundNumber, stepNumber } = await this.getGameStepAndRound(
      roomId,
      gameId,
    );

    return await prs.getRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.stepScore(roundNumber, stepNumber),
      0,
    );
  }

  async setStepScore(roomId, gameId, score) {
    const { roundNumber, stepNumber } = await this.getGameStepAndRound(
      roomId,
      gameId,
    );

    await prs.setRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.stepScore(roundNumber, stepNumber),
      score,
    );
  }

  async setStepStartedAt(roomId, gameId, roundId, stepId, value) {
    await prs.setRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.stepStartedAt(roundId, stepId),
      value,
    );
  }

  async getStepStartedAt(roomId, gameId, roundId, stepId) {
    return await prs.getRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.stepStartedAt(roundId, stepId),
      null,
    );
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

  async getStepWords(roomId, gameId) {
    return await prs.getRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.currentStepWords,
      [],
    );
  }

  async setStepWords(roomId, gameId, words = []) {
    await prs.setRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.currentStepWords,
      words,
    );
  }

  async setStepWord(roomId, gameId, word) {
    const words = await this.getStepWords(roomId, gameId);

    words.push(word);

    await this.setStepWords(roomId, gameId, words);
  }

  async editStepWord(roomId, gameId, word, index) {
    const words = await this.getStepWords(roomId, gameId);

    words[index] = word;

    await this.setStepWords(roomId, gameId, words);
  }

  async setStepWordWithScore(roomId, gameId, word) {
    const oldScore = await this.getStepScore(roomId, gameId);

    const score = word.guessed ? oldScore + 1 : oldScore - 1;

    await this.setStepWord(roomId, gameId, word);
    await this.setStepScore(roomId, gameId, score);
  }

  async editStepWordWithScore(roomId, gameId, word, index) {
    const oldScore = await this.getStepScore(roomId, gameId);

    const score = word.guessed ? oldScore + 2 : oldScore - 2;

    await this.editStepWord(roomId, gameId, word, index);
    await this.setStepScore(roomId, gameId, score);
  }

  async getRandomWords(roomId, gameId) {
    const datasets = await roomService.getRoomGameDatasets(roomId);
    const availableDatasets = datasets.filter(
      (dataset) => dataset.status === 'active',
    );
    return await this.getGameWords(roomId, gameId, availableDatasets, 20);
  }

  async getRound(roomId, gameId) {
    return await prs.getRoomGameParam(roomId, gameId, this.storageKeys.round);
  }

  async pushManyUsedGameWords(roomId, gameId, usedWordList) {
    const usedWords = await this.getUsedGameWords(roomId, gameId);
    usedWordList.forEach((index) => usedWords.push(index));
    await this.setUsedGameWords(roomId, gameId, usedWords);
    return usedWords;
  }

  async getUsedGameWords(roomId, gameId) {
    return await prs.getRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.gameUsedWords,
      [],
    );
  }

  async setUsedGameWords(roomId, gameId, usedWords) {
    await prs.getRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.gameUsedWords,
      usedWords,
    );
  }

  async getGameWords(roomId, gameId, datasets, limit) {
    let attempts = 0;
    const attemptsLimit = 100;
    const wordsCounters = datasets.map((dataset) => dataset.counter);
    const usedKeys = await this.getRoomGameRequestedWords(roomId, gameId);
    const uniqueRequestWords = [];
    const result = [];
    while (result.length < limit) {
      const { randomDatasetIndex, randomDatasetWord } =
        this.getRandomNumbers(wordsCounters);
      const index = this.packWordIndex(randomDatasetIndex, randomDatasetWord);
      if (attempts < attemptsLimit) {
        if (usedKeys.includes(index)) {
          attempts += 1;
          continue;
        }
      }

      if (uniqueRequestWords.includes(index)) {
        continue;
      }
      const word = await wordService.getDatasetWord(
        datasets[randomDatasetIndex],
        randomDatasetWord,
      );
      usedKeys.push(index);
      uniqueRequestWords.push(index);
      result.push({
        value: word,
        index: index,
        guessed: null,
      });
      attempts += 1;
    }
    await this.setRoomGameRequestedWords(roomId, gameId, usedKeys);
    return result;
  }

  async setRoomGameRequestedWords(roomId, gameId, usedKeys) {
    await prs.setRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.gameRequestedWords,
      usedKeys,
    );
  }

  async getRoomGameRequestedWords(roomId, gameId) {
    return await prs.getRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.gameRequestedWords,
      [],
    );
  }

  packWordIndex(randomDatasetIndex, randomDatasetWord) {
    return randomDatasetIndex * 100000 + randomDatasetWord;
  }

  unpackWordIndex(index) {
    return {
      randomDatasetIndex: parseInt(index / 100000),
      randomDatasetWord: parseInt(index % 100000),
    };
  }

  async getRandomWordsFromDataset(roomId, gameId, randomDataset, n) {
    const datasetWords = await wordService.getGameDataset(randomDataset);
    const loadedWords = await prs.getRoomGameParam(
      roomId,
      gameId,
      `played_out_words_dataset_${randomDataset.datasetId}`,
      [],
    );

    const filteredDatasetWords = datasetWords.filter(
      (word) => !loadedWords.includes(word),
    );

    if (filteredDatasetWords < n) {
      return filteredDatasetWords;
    }
  }

  getRandomNumbers(wordsCounters) {
    const randomDatasetIndex = Math.floor(Math.random() * wordsCounters.length);
    const randomDatasetWord = Math.floor(
      Math.random() * wordsCounters[randomDatasetIndex],
    );
    return { randomDatasetIndex, randomDatasetWord };
  }

  async getFirstTeamId(roomId) {
    const teams = await roomService.getTeams(roomId);
    return teams[0].teamId;
  }

  async setCurrentTeam(roomId, gameId, teamId, explainerId, guesserId) {
    await prs.setRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.currentMoveTeam,
      {
        teamId,
        explainerId,
        guesserId,
      },
    );
  }

  async getCurrentTeam(roomId, gameId) {
    return await prs.getRoomGameParam(
      roomId,
      gameId,
      this.storageKeys.currentMoveTeam,
    );
  }

  async setFirstStepTeamParams(roomId, gameId) {
    const teamId = await this.getFirstTeamId(roomId, gameId);
    const team = await roomService.getTeam(roomId, teamId);

    await this.setCurrentTeam(
      roomId,
      gameId,
      teamId,
      team.memberIds[0],
      team.memberIds[1],
    );
  }
}

export default new GameService();
