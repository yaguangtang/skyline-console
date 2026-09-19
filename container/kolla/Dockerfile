# Compile the console once, then layer its static assets onto Kolla's console
# image so the upstream entrypoint, nginx configuration, and healthcheck stay
# unchanged.
ARG BASE_IMAGE=quay.io/openstack.kolla/skyline-console:2026.1-ubuntu-noble
FROM node:12-buster AS builder

WORKDIR /src

COPY package.json yarn.lock ./
RUN npm install --global yarn@1.22.22 \
    && yarn install --frozen-lockfile

COPY . ./

ARG GIT_COMMIT
RUN yarn build \
    && printf '%s\n' "${GIT_COMMIT}" > skyline_console/static/commit_id.txt

FROM ${BASE_IMAGE}

ARG GIT_COMMIT
LABEL org.opencontainers.image.revision=${GIT_COMMIT}
LABEL org.opencontainers.image.source="https://github.com/yaguangtang/skyline-console"

USER root
COPY --from=builder --chown=root:root /src/skyline_console/static/ \
  /var/lib/kolla/venv/lib/python3.12/site-packages/skyline_console/static/
