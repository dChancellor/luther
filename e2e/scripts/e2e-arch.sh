#!/usr/bin/env bash
set -euo pipefail

SERVER_PORT=4173
export PLAYWRIGHT_BASE_URL="http://127.0.0.1:${SERVER_PORT}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if command -v lsof >/dev/null 2>&1; then
  if lsof -ti tcp:$SERVER_PORT >/dev/null 2>&1; then
    kill -9 $(lsof -ti tcp:$SERVER_PORT) || true
  fi
fi

npm run build

npm run preview -- --port "${SERVER_PORT}" --host &
PREVIEW_PID=$!

# Wait for app server
until curl -s "${PLAYWRIGHT_BASE_URL}/" >/dev/null; do
  sleep 0.2
done

PORT="${PW_SERVER_PORT:-3000}"
HOST="${PW_SERVER_HOST:-127.0.0.1}"
CONTAINER_NAME="${PW_SERVER_CONTAINER_NAME:-pw-server}"
IMAGE="${PW_SERVER_IMAGE:-mcr.microsoft.com/playwright}"

get_pw_version() {
  local v=""
  v="$(node -p "try{require('@playwright/test/package.json').version}catch(e){''}")"
  if [[ -z "$v" ]]; then
    v="$(node -p "try{require('playwright/package.json').version}catch(e){''}")"
  fi
  echo "$v"
}

PW_VERSION="$(get_pw_version)"
if [[ -z "$PW_VERSION" ]]; then
  echo "Could not determine Playwright version."
  exit 1
fi

TAG="${PW_SERVER_TAG:-v${PW_VERSION}-jammy}"
FULL_IMAGE="${IMAGE}:${TAG}"
FALLBACK_IMAGE="${IMAGE}:jammy"

sudo -v

cleanup() {
  sudo docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  kill "${PREVIEW_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

sudo docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

if ! sudo docker pull "${FULL_IMAGE}" >/dev/null 2>&1; then
  FULL_IMAGE="${FALLBACK_IMAGE}"
  sudo docker pull "${FULL_IMAGE}" >/dev/null 2>&1 || true
fi

sudo docker run -d \
  --name "${CONTAINER_NAME}" \
  --rm \
  --init \
  --network host \
  "${FULL_IMAGE}" \
  /bin/sh -c "cd /home/pwuser && npx -y playwright@${PW_VERSION} run-server --port ${PORT} --host 127.0.0.1" \
  >/dev/null

echo "Waiting for Playwright WS server on ${HOST}:${PORT}..."

TIMEOUT_SECS="${PW_SERVER_TIMEOUT_SECS:-30}"
end=$((SECONDS + TIMEOUT_SECS))
WS_URL="ws://${HOST}:${PORT}/"

while true; do
  if node -e "
    const url='${WS_URL}';
    const ws = new WebSocket(url);
    const t = setTimeout(() => { ws.close(); process.exit(2); }, 500);
    ws.onopen = () => { clearTimeout(t); ws.close(); process.exit(0); };
    ws.onerror = () => { clearTimeout(t); process.exit(2); };
  " >/dev/null 2>&1; then
    break
  fi

  if ((SECONDS >= end)); then
    echo "Timed out waiting for websocket at ${WS_URL}"
    sudo docker logs "${CONTAINER_NAME}" || true
    exit 1
  fi

  sleep 0.2
done

# PW_TEST_CONNECT_WS_ENDPOINT="ws://${HOST}:${PORT}/" \
#   npx playwright test --config playwright.config.ts
#

PW_TEST_CONNECT_WS_ENDPOINT="ws://${HOST}:${PORT}/" \
  npx playwright test --config playwright.config.ts --project=api --project=chromium --project=firefox --project=webkit
