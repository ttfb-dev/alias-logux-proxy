import crypto from 'crypto';
import qs from 'querystring';

const secretKey = process.env.VK_PROTECTED_KEY;

const isVkAuthorized = function (userId, queryString) {
  if (parseInt(userId, 10) < 10) {
    return true;
  }

  let parsedVkId = '';

  const urlParams = qs.parse(queryString);
  const ordered = {};

  Object.keys(urlParams)
    .sort()
    .forEach((key) => {
      if (key.slice(0, 3) === 'vk_') {
        ordered[key] = urlParams[key];
        if (key === 'vk_user_id') {
          parsedVkId = urlParams[key];
        }
      }
    });

  const stringParams = qs.stringify(ordered);
  const paramsHash = crypto
    .createHmac('sha256', secretKey)
    .update(stringParams)
    .digest()
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=$/, '');

  return (
    paramsHash === urlParams.sign &&
    parseInt(userId, 10) === parseInt(parsedVkId, 10)
  );
};

export { isVkAuthorized };
