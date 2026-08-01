# NEXT_PUBLIC_* инлайнятся на этапе build → .env.local должен быть в контексте.
FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# next start слушает 0.0.0.0:3000
CMD ["npm", "start"]
