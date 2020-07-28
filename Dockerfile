FROM node:10-alpine

RUN mkdir /app
ADD . /app

WORKDIR /app
RUN NODE_ENV=production npm install

CMD ["npm", "start"]
