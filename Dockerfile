# PING Express API — Cloud Run (회원·게스트 인증 등). UI는 Vercel Next.
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
ENV PING_SKIP_NEXT_ENSURE=1
RUN npm ci --ignore-scripts

COPY . .

ENV NODE_ENV=production
ENV PING_EXPRESS_API_ONLY=1
ENV PING_DEV_LIGHT=1
ENV PING_MEMBER_DATA_DIR=/data
ENV PORT=8080

EXPOSE 8080

CMD ["node", "scripts/start-express-cloud-run.cjs"]
