#!/bin/bash

set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ITERATIONS="${1:-}"
if [ -z "$ITERATIONS" ] || ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || [ "$ITERATIONS" -lt 1 ]; then
  echo "Usage: $0 <iterations>" >&2
  exit 1
fi

MAIN_SESSION_ID="6ff112b2-d59e-49fc-9b8f-42d2a096a1bb"
VALIDATOR_SESSION_ID="5402d0a2-0f1e-430d-913a-414f8a1b889c"
CRITIC_SESSION_ID="333a6cbf-c6af-4498-a310-feb20be44cf9"

bash "$WORKSPACE_DIR/ralph.sh" \
  "$ITERATIONS" \
  "$MAIN_SESSION_ID" \
  --validate-every 1 \
  --validator-session-id "$VALIDATOR_SESSION_ID" \
  --critic \
  --critic-every 1 \
  --critic-session-id "$CRITIC_SESSION_ID"
