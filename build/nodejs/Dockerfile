FROM node:14

# создание директории приложения
WORKDIR /usr/src/app

RUN mkdir /etc/ssl

COPY src                ./src
COPY package.json       package.json
COPY yarn.lock          yarn.lock

RUN yarn install
# Если вы создаете сборку для продакшн
# RUN npm ci --only=production

CMD [ "yarn", "start" ]