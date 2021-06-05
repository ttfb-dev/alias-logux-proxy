import { prs, logger } from '../libs/index.js';

class WordService {

  constructor() {
    this.gameDatasets = [];
  }

  async getRandomRoomName (lang = 'ru') {
    const availableRoomNamesString = await prs.getAppParam(`word_dataset_${lang}_rooms`);
    const availableRoomNames = availableRoomNamesString.split(',');
    return availableRoomNames[Math.floor(Math.random() * availableRoomNames.length)];
  }

  // генерирует пустую команду со случайным неповторяющимся названием
  async getRandomRoomNames(lang = 'ru', count = 10) {
    const availableRoomNamesString = await prs.getAppParam(`word_dataset_${lang}_rooms`);
    const availableRoomNames = availableRoomNamesString.split(',');

    return this.__getRandomNWords(availableRoomNames, count);
  }

  async getRandomTeamNames(lang = 'ru', count = 15) {
    const availableTeamNamesString = await prs.getAppParam(`word_dataset_${lang}_teams`);
    const availableTeamNames = availableTeamNamesString.split(',');

    return this.__getRandomNWords(availableTeamNames, count);
  }

  async getRoomNames(lang = 'ru') {
    const availableRoomNamesString = await prs.getAppParam(`word_dataset_${lang}_rooms`);
    return availableRoomNamesString.split(',');
  }

  async getTeamNames(lang = 'ru') {
    const availableTeamNamesString = await prs.getAppParam(`word_dataset_${lang}_teams`);
    return availableTeamNamesString.split(',');
  }

  async getGameDatasetWords(dataset) {
    const key = `word_dataset_${dataset.lang}_game_${dataset.key}`;
    if (this.gameDatasets[key]) {
      console.log(this.gameDatasets[key]);
      return this.gameDatasets[key];
    }
    const availableGameDatasetString = await prs.getAppParam(key);
    const wordsArray = availableGameDatasetString.split(',');
    this.gameDatasets[key] = wordsArray;
    return wordsArray;
  }

  async getGameDataset(datasetId) {
    const gameDatasets = await this.getGameDatasets()

    let dataset = null;

    gameDatasets.forEach(gameDataset => {
      if (gameDataset.datasetId === datasetId) {
        dataset = gameDataset;
      }
    });

    return dataset;
  }

  async getLangGameDatasets(lang) {
    const datasets = await prs.getAppParam('word_datasets', {});
    return datasets.filter(dataset => dataset.type === 'game' && dataset.lang === lang).map(this.mapGameDataset);
  }

  async getGameDatasets() {
    const datasets = await prs.getAppParam('word_datasets', {});
    return datasets.filter(dataset => dataset.type === 'game').map(this.mapGameDataset);
  }

  mapGameDataset(dataset) {
    delete dataset.src;
    return dataset;
  }

  __getRandomNWords(wordArray, n) {
    if (n > wordArray.length) {
      throw new Error('Not enouth words');
    }
    // Shuffle array
    const shuffled = wordArray.sort(() => 0.5 - Math.random());
    // Get sub-array of first n elements after shuffled
    return shuffled.slice(0, n);
  }

  async getDatasetWord(dataset, wordIndex) {
    const datasetWords = await this.getGameDatasetWords(dataset);
    if (wordIndex >= datasetWords.length) {
      throw new Error(`Cant get index ${wordIndex} in dataset ${dataset.datasetId}: it has ${datasetWords.length} words`)
    }
    return datasetWords[wordIndex];
  }
}

export default new WordService;