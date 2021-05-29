import { prs, logger } from '../libs/index.js';

class ProfileService {

  async getPurchasedDatasetIds(userId) {
    return await prs.getUserParam(userId, 'purchased_dataset_ids', []);
  }

  async addPurchasedDatasetId(userId, datasetId) {
    const purchasedDatasetIds = this.getPurchasedDatasetsList(userId);
    purchasedDatasetIds.push(datasetId);
    await prs.setUserParam(userId, 'purchased_dataset_ids', purchasedDatasetIds)
  }

  async getActiveDatasetIds(userId) {
    return await prs.getUserParam(userId, 'activated_dataset_ids', []);
  }

  async addActiveDatasetId(userId, datasetId) {
    const activeDatasetIds = this.getActiveDatasetIds(userId);
    activeDatasetIds.push(datasetId);
    await prs.setUserParam(userId, 'activated_dataset_ids', activeDatasetIds)
  }
}

export { ProfileService };