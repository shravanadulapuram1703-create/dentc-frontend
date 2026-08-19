# ---- Build stage: compile the Vite SPA ----
FROM node:20-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_* vars are baked into the bundle at BUILD time (not runtime).
# The backend URL must be passed here as a build arg.
# NOTE: .env is excluded by .dockerignore, so ANY VITE_* var the app needs must be
# threaded through here — otherwise it silently falls back to its schema default.
ARG VITE_API_BASE_URL
ARG VITE_APP_ENV=production
ARG VITE_APP_VERSION=4.3.0
# Help Center → Jira. The proxy URL defaults to $VITE_API_BASE_URL/api/v1/support/tickets
# (see src/shared/config/env.ts), so only the mode and project key are passed here.
ARG VITE_JIRA_MODE=proxy
ARG VITE_JIRA_PROJECT_KEY=KAN
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_JIRA_MODE=$VITE_JIRA_MODE
ENV VITE_JIRA_PROJECT_KEY=$VITE_JIRA_PROJECT_KEY
RUN npm run build

# ---- Runtime stage: serve dist/ with the existing Express server ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY server.js ./

# server.js reads process.env.PORT; Cloud Run sets it to 8080.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
