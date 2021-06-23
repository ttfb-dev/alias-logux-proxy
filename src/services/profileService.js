import { prs, logger, udatasets } from '../libs';
import { wordService } from '.';

class ProfileService {
  async getPurchasedDatasetIds(userId) {
    return await prs.getUserParam(userId, 'purchased_dataset_ids', []);
  }

  async addPurchasedDatasetId(userId, datasetId) {
    const purchasedDatasetIds = await this.getPurchasedDatasetIds(userId);
    purchasedDatasetIds.push(datasetId);
    await prs.setUserParam(
      userId,
      'purchased_dataset_ids',
      purchasedDatasetIds,
    );
  }

  async getActiveDatasetIds(userId) {
    return await udatasets.getActive(userId);
  }

  async activateDatasetId(userId, datasetId) {
    return await udatasets.activate(userId, datasetId);
  }

  async deactivateDatasetId(userId, datasetId) {
    return await udatasets.deactivate(userId, datasetId);
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
    datasets.forEach((dataset) => {
      const isActive = activeIds.includes(dataset.datasetId);
      const isPurchased = purchasedIds.includes(dataset.datasetId);
      const isFree = dataset.price === 0;
      const isAvailable = isFree || isPurchased;

      dataset.status = isActive
        ? 'active'
        : isAvailable
        ? 'inactive'
        : 'available';
    });

    return datasets;
  }
}

export default new ProfileService();
