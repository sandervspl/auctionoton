FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set the Docker working directory as /usr/src/app
# Copy everything from here into Docker's /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app

# Install the dependencies
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod

FROM base
COPY --from=prod-deps /usr/src/app/node_modules /usr/src/app/node_modules

# The port that the server will listen on
EXPOSE 8080

# Run the webserver
CMD pnpm dlx tsx src/index.ts
