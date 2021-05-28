import { prs, logger } from '../libs/index.js';

class ProfileService {

  async getPurchasedDatasetsList(userId) {
    return await prs.getUserParam(userId, 'purchased_datasets', []);
  }

  async addPurchasedDataset(userId, dataset) {
    const purchasedDatasets = this.getPurchasedDatasetsList(userId);
    purchasedDatasets.push(dataset);
    await prs.setUserParam(userId, 'purchased_datasets', purchasedDatasets)
  }
}

export { ProfileService };