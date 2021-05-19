FROM node:14

# создание директории приложения
WORKDIR /usr/src/app

COPY src                ./src
COPY package.json       package.json
COPY yarn.lock          yarn.lock
COPY .npmrc             .npmrc

RUN yarn install
# Если вы создаете сборку для продакшн
# RUN npm ci --only=production

EXPOSE 31337

CMD [ "yarn", "start" ]