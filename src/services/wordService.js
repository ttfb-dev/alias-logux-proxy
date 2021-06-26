import { datasets } from '../libs';

class WordService {

  async getRandomRoomName(lang = 'ru') {
    const availableRoomNames = await datasets.getWordsById(1);
    return availableRoomNames[
      Math.floor(Math.random() * availableRoomNames.length)
    ];
  }

  // генерирует пустую команду со случайным неповторяющимся названием
  async getRandomRoomNames(lang = 'ru', count = 10) {
    const availableRoomNames = await datasets.getWordsById(1);

    return this.__getRandomNWords(availableRoomNames, count);
  }

  async getRandomTeamNames(lang = 'ru', count = 15) {
    const availableTeamNames = await datasets.getWordsById(2);

    return this.__getRandomNWords(availableTeamNames, count);
  }

  async getRoomNames(lang = 'ru') {
    return await datasets.getWordsById(1);
  }

  async getTeamNames(lang = 'ru') {
    return await datasets.getWordsById(2);
  }

  async getGameDatasetWords(datasetId) {
    return await datasets.getWordsById(datasetId);
  }

  async getGameDataset(datasetId) {
    return await datasets.getById(datasetId);
  }

  async getLangGameDatasets(lang) {
    const gameDatasets = await this.getGameDatasets();
    return gameDatasets
      .filter(dataset => dataset.lang === lang);
  }

  async getGameDatasets() {
    const datasetList = await datasets.getAll();
    return datasetList
      .filter((dataset) => dataset.content === 'game');
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
    const datasetWords = await this.getGameDatasetWords(dataset.datasetId);
    if (wordIndex >= datasetWords.length) {
      throw new Error(
        `Cant get index ${wordIndex} in dataset ${dataset.datasetId}: it has ${datasetWords.length} words`,
      );
    }
    return datasetWords[wordIndex];
  }
}

export default new WordService();
