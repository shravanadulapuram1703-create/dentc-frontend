# ---- Build stage: compile the Vite SPA ----
FROM node:20-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_* vars are baked into the bundle at BUILD time (not runtime).
# The backend URL must be passed here as a build arg.
ARG VITE_API_BASE_URL
ARG VITE_APP_ENV=production
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_ENV=$VITE_APP_ENV
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
