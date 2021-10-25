import { datasets, prs, udatasets } from '../libs';

import { flags } from './wordService';
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

  async toggleSet(userId, datasetId) {
    const isActive = await this.isDatasetActive(userId, datasetId);

    if (isActive) {
      await udatasets.deactivate(userId, datasetId);
    } else {
      await udatasets.activate(userId, datasetId);
    }
  }

  async getDatasetsWithStatus(userId) {
    const allDatasets = await wordService.getGameDatasets();

    const activeIds = await this.getActiveDatasetIds(userId);

    const localFlags = { ...flags };

    localFlags.isJoinedGroup = await this.isJoinedGroup(userId);

    localFlags.isDonut = await this.isDonut(userId);

    const fixedIds = await udatasets.getFixed(userId);

    return this.mapDatasetsWithStatus(
      activeIds,
      fixedIds,
      localFlags,
      allDatasets,
    );
  }

  async isJoinedGroup(userId) {
    return prs.getUserParam(userId, 'is_group_member', false);
  }

  async isDonut(userId) {
    return prs.getUserParam(userId, 'is_donut', false);
  }

  async isOnboardingFinished(userId) {
    return prs.getUserParam(userId, 'is_onboarding_finished', false);
  }

  async setOnboardingFinished(userId) {
    return prs.setUserParam(userId, 'is_onboarding_finished', true);
  }

  async isDatasetActive(userId, datasetId) {
    const activeDatasetIds = await this.getActiveDatasetIds(userId);
    return activeDatasetIds.includes(datasetId);
  }

  async isDatasetFree(datasetId) {
    const dataset = await datasets.getById(datasetId);
    return dataset.type === 'free';
  }

  async isDatasetAvailable(userId, datasetId) {
    const dataset = await datasets.getById(datasetId);

    if (dataset.type === 'free') {
      return true;
    }

    if (dataset.type === 'subscribe') {
      return await this.isJoinedGroup(userId);
    }

    if (dataset.type === 'donut') {
      return await this.isDonut(userId);
    }

    return false;
  }

  async isDatasetPurchased(userId, datasetId) {
    const purchasedDatasetIds = await this.getPurchasedDatasetIds(userId);
    return purchasedDatasetIds.includes(datasetId);
  }

  mapDatasetsWithStatus(activeIds, fixedIds, flags, datasets) {
    console.log({ activeIds, fixedIds, flags });
    datasets.forEach((dataset) => {
      let isAvailableToActivate = fixedIds.includes(dataset.datasetId);

      if (!isAvailableToActivate) {
        switch (dataset.type) {
          case 'free':
            isAvailableToActivate = true;
            break;
          case 'subscribe':
            isAvailableToActivate = flags.isJoinedGroup;
            break;
          case 'donut':
            isAvailableToActivate = flags.isDonut;
            break;
        }
      }

      const isActive = activeIds.includes(dataset.datasetId);

      dataset.status =
        isAvailableToActivate && isActive
          ? 'active'
          : isAvailableToActivate
          ? 'inactive'
          : 'available';
    });

    return datasets;
  }
}

export default new ProfileService();
