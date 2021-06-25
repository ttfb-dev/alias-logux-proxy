import { prs, udatasets } from '../libs';
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

    const activeIds = await this.getActiveDatasetIds(userId);

    const isJoinedGroup = await this.isJoinedGroup(userId);

    const isDonut = await this.isDonut(userId);

    return this.mapDatasetsWithStatus(activeIds, isJoinedGroup, isDonut, datasets);
  }

  async isJoinedGroup(userId) {
    return prs.getUserParam(userId, 'is_group_member', false);
  }

  async isDonut(userId) {
    return prs.getUserParam(userId, 'is_donut', false);
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

  mapDatasetsWithStatus(activeIds, isJoinedGroup, isDonut, datasets) {
    datasets.forEach((dataset) => {
      const isActive = activeIds.includes(dataset.datasetId);
      const isAvaliableByGroupJoin = dataset.type === 'subscribe' && isJoinedGroup;
      const isAvaliableByDonut = dataset.type === 'donut' && isDonut;
      const isFree = dataset.type === 'free';
      const isAvailable = isAvaliableByGroupJoin && isAvaliableByDonut && isFree;

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
