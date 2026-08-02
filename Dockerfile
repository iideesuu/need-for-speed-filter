FROM mirror.gcr.io/library/alpine:3.21

WORKDIR /app

RUN apk add --no-cache nodejs npm

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
