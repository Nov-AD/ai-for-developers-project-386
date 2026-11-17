FROM node:24.11.1-bookworm-slim AS build
WORKDIR /build
RUN npm install --global pnpm@12.21.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contract/package.json packages/contract/package.json
COPY packages/sdk/package.json packages/sdk/package.json
RUN pnpm install --frozen-lockfile

COPY . .
# An empty base URL makes the generated SDK call the same origin as the SPA.
ENV VITE_API_URL=""
RUN pnpm build && pnpm --filter @calendar/api deploy --prod --legacy /out

FROM node:24.11.1-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    WEB_ROOT=/app/public
WORKDIR /app
COPY --from=build --chown=node:node /out/ ./
COPY --from=build --chown=node:node /build/apps/web/dist/ ./public/
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"
# exec makes Node PID 1, so Fastify receives SIGTERM and closes gracefully.
CMD ["sh", "-c", "exec node node_modules/fastify-cli/cli.js start --address 0.0.0.0 --port \"$PORT\" --log-level info dist/app.js"]
