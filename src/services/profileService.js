import { prs, logger } from '../libs/index.js';
import { wordService } from './index.js';

class ProfileService {

  async getPurchasedDatasetIds(userId) {
    return await prs.getUserParam(userId, 'purchased_dataset_ids', []);
  }

  async addPurchasedDatasetId(userId, datasetId) {
    const purchasedDatasetIds = await this.getPurchasedDatasetIds(userId);
    purchasedDatasetIds.push(datasetId);
    await prs.setUserParam(userId, 'purchased_dataset_ids', purchasedDatasetIds)
  }

  async getActiveDatasetIds(userId) {
    return await prs.getUserParam(userId, 'activated_dataset_ids', []);
  }

  async activateDatasetId(userId, datasetId) {
    const activeDatasetIds = await this.getActiveDatasetIds(userId);
    activeDatasetIds.push(datasetId);
    await prs.setUserParam(userId, 'activated_dataset_ids', activeDatasetIds);
    return activeDatasetIds;
  }

  async deactivateDatasetId(userId, datasetId) {
    const activeDatasetIds = await this.getActiveDatasetIds(userId);
    activeDatasetIds.push(datasetId);
    const newActiveDatasets = activeDatasetIds.filter(activeDatasetId => activeDatasetId !== datasetId);
    await prs.setUserParam(userId, 'activated_dataset_ids', newActiveDatasets);
    return newActiveDatasets;
  }

  async getDatasetsWithStatus(userId) {
    const datasets = await wordService.getGameDatasets();

    const purchasedIds = await this.getPurchasedDatasetIds(userId);

    const activeIds = await this.getActiveDatasetIds(userId);

    return this.mapDatasetsWithStatus(activeIds, purchasedIds, datasets);
  }

  async isDatasetActive(userId, datasetId) {
    const activeDatasetIds = await this.getActiveDatasetIds(userId);
    return activeDatasetIds.includes(datasetId);
  }

  async isDatasetFree(datasetId) {
    const dataset = await wordService.getGameDataset(datasetId);
    return dataset.price === 0;
  }

  async isDatasetAvailable(userId, datasetId) {
    const isFree = await this.isDatasetFree(datasetId);
    if (isFree) {
      return true;
    }
    const isPurchased = await this.isDatasetPurchased(userId, datasetId);
    return isPurchased;
  }

  async isDatasetPurchased(userId, datasetId) {
    const purchasedDatasetIds = await this.getPurchasedDatasetIds(userId);
    return purchasedDatasetIds.includes(datasetId);
  }

  mapDatasetsWithStatus(activeIds, purchasedIds, datasets) {
    datasets.forEach(dataset => {
      const isActive = activeIds.includes(dataset.datasetId)
      const isPurchased = purchasedIds.includes(dataset.datasetId)
      const isFree = dataset.price === 0
      const isAvailable = isFree || isPurchased;

      dataset.status = isActive 
        ? 'active' 
        : isAvailable 
          ? 'inactive'
          : 'available';
    })

    return datasets;
  }
}

export default new ProfileService;