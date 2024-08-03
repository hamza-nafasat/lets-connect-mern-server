FROM node:20-alpine
RUN npm install pm2 -g
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN chown -R node:node /app && chmod -R 755 /app
COPY ecosystem.config.cjs .
USER node
EXPOSE 4000
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]
