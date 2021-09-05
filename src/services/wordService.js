import { datasets } from '../libs';

class WordService {
  async getRandomRoomName() {
    const availableRoomNames = await datasets.getWordsById(1);
    return availableRoomNames[
      Math.floor(Math.random() * availableRoomNames.length)
    ];
  }

  // генерирует пустую команду со случайным неповторяющимся названием
  async getRandomRoomNames(count = 10) {
    const availableRoomNames = await datasets.getWordsById(1);

    return this.__getRandomNWords(availableRoomNames, count);
  }

  async getRandomTeamNames(count = 15) {
    const availableTeamNames = await datasets.getWordsById(2);

    return this.__getRandomNWords(availableTeamNames, count);
  }

  async getRoomNames() {
    return await datasets.getWordsById(1);
  }

  async getTeamNames() {
    return await datasets.getWordsById(2);
  }

  async getGameDatasetWords(datasetId) {
    return await datasets.getWordsById(datasetId);
  }

  async getGameDataset(datasetId) {
    return await datasets.getById(datasetId);
  }

  async getGameDatasets() {
    const datasetList = await datasets.getAll();
    return datasetList.filter((dataset) => dataset.content === 'game');
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
