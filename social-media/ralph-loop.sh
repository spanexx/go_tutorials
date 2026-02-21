#!/bin/bash

set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ITERATIONS="${1:-}"
if [ -z "$ITERATIONS" ] || ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || [ "$ITERATIONS" -lt 1 ]; then
  echo "Usage: $0 <iterations>" >&2
  exit 1
fi

MAIN_SESSION_ID="44d44a61-9063-469a-982a-97e9775dc077"
VALIDATOR_SESSION_ID="df86b544-c948-4e63-b8a5-9d87a07b6317"
CRITIC_SESSION_ID="be275788-0e5c-4b52-96f5-500bca4f3d8f"

bash "$WORKSPACE_DIR/ralph.sh" \
  "$ITERATIONS" \
  "$MAIN_SESSION_ID" \
  --validate-every 1 \
  --validator-session-id "$VALIDATOR_SESSION_ID" \
  --critic \
  --critic-every 1 \
  --critic-session-id "$CRITIC_SESSION_ID"
