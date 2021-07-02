import fetch from 'node-fetch';

import { logger } from './logger';

const token = process.env.VK_APP_TOKEN;

const apiHost = 'https://api.vk.com';

const vkapi = {
  getUsers: async (user_ids) => {
    try {
      const response = await fetch(
        `${apiHost}/method/users.get?user_ids=${user_ids.join(
          ',',
        )}&access_token=${token}&v=5.131`,
      );

      if (!response.ok) {
        throw new Error(`Response status is not OK: ${response.status}`);
      }

      return (await response.json()).response;
    } catch ({ message }) {
      logger.critical(message, { user_ids });
    }
  },
};

export default vkapi;
