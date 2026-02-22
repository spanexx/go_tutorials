#!/bin/bash

set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ITERATIONS="${1:-}"
if [ -z "$ITERATIONS" ] || ! [[ "$ITERATIONS" =~ ^[0-9]+$ ]] || [ "$ITERATIONS" -lt 1 ]; then
  echo "Usage: $0 <iterations>" >&2
  exit 1
fi

MAIN_SESSION_ID="b9bbee9e-679d-4e10-9342-837502a47621"
VALIDATOR_SESSION_ID="7a0e1ed4-1875-4576-888b-1252ae41dfcb"
CRITIC_SESSION_ID="69cc70f4-0638-419d-822a-e9ee5f8160ce"


bash "$WORKSPACE_DIR/ralph.sh" \
  "$ITERATIONS" \
  "$MAIN_SESSION_ID" \
  --validate-every 1 \
  --validator-session-id "$VALIDATOR_SESSION_ID" \
  --critic \
  --critic-every 1 \
  --critic-session-id "$CRITIC_SESSION_ID"
