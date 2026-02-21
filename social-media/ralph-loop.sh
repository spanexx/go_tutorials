#!/bin/bash

set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ITERATIONS="${1:-}"
if [ -z "$ITERATIONS" ] || ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || [ "$ITERATIONS" -lt 1 ]; then
  echo "Usage: $0 <iterations>" >&2
  exit 1
fi

MAIN_SESSION_ID="5e4ea60e-3b5c-4f85-97a5-3b3ad1ceb597"
VALIDATOR_SESSION_ID="a090ab17-0b32-4e8d-84c3-eef711ff7356"
CRITIC_SESSION_ID="08605365-791d-4fe8-a977-f05a6770edd7"

bash "$WORKSPACE_DIR/ralph.sh" \
  "$ITERATIONS" \
  "$MAIN_SESSION_ID" \
  --validate-every 1 \
  --validator-session-id "$VALIDATOR_SESSION_ID" \
  --critic \
  --critic-every 1 \
  --critic-session-id "$CRITIC_SESSION_ID"
