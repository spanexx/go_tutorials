#!/bin/bash

set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHAT_DIR="$WORKSPACE_DIR/.ralph"
CHAT_FILE_DEFAULT="$CHAT_DIR/chat.log"
LOCK_FILE_DEFAULT="$CHAT_DIR/chat.lock"
MAX_LINES_DEFAULT=300

CHAT_FILE="${RALPH_CHAT_FILE:-$CHAT_FILE_DEFAULT}"
LOCK_FILE="${RALPH_CHAT_LOCK_FILE:-$LOCK_FILE_DEFAULT}"
MAX_LINES="${RALPH_CHAT_MAX_LINES:-$MAX_LINES_DEFAULT}"

mkdir -p "$CHAT_DIR"

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

trim_file() {
  local file="$1"
  local max_lines="$2"

  if [ ! -f "$file" ]; then
    return 0
  fi

  local tmp
  tmp="${file}.tmp"
  tail -n "$max_lines" "$file" > "$tmp" || true
  mv "$tmp" "$file"
}

cmd_post() {
  local role="$1"
  shift
  local msg="$*"

  if [ -z "$role" ] || [ -z "$msg" ]; then
    echo "Usage: $0 post <ROLE> <message...>" >&2
    exit 2
  fi

  role="$(echo "$role" | tr '[:lower:]' '[:upper:]')"

  exec 9>"$LOCK_FILE"
  flock 9

  printf '[%s] [%s] %s\n' "$(timestamp)" "$role" "$msg" >> "$CHAT_FILE"
  trim_file "$CHAT_FILE" "$MAX_LINES"

  flock -u 9
}

cmd_tail() {
  local n="${1:-50}"
  if ! [[ "$n" =~ ^[0-9]+$ ]]; then
    echo "Usage: $0 tail [N]" >&2
    exit 2
  fi

  [ -f "$CHAT_FILE" ] || exit 0
  tail -n "$n" "$CHAT_FILE"
}

cmd_path() {
  echo "$CHAT_FILE"
}

case "${1:-}" in
  post)
    shift
    cmd_post "${1:-}" "${@:2}"
    ;;
  tail)
    shift
    cmd_tail "${1:-50}"
    ;;
  path)
    cmd_path
    ;;
  -h|--help|help|"" )
    cat <<EOF
Usage:
  $0 post <ROLE> <message...>
  $0 tail [N]
  $0 path

Environment overrides:
  RALPH_CHAT_FILE        (default: $CHAT_FILE_DEFAULT)
  RALPH_CHAT_LOCK_FILE   (default: $LOCK_FILE_DEFAULT)
  RALPH_CHAT_MAX_LINES   (default: $MAX_LINES_DEFAULT)
EOF
    ;;
  *)
    echo "Unknown command: $1" >&2
    exit 2
    ;;
esac
