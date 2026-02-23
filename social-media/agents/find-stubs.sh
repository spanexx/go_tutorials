#!/bin/bash
# Integration script to use stub-detector with ralph-critic.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$SCRIPT_DIR/tools"

# Determine workspace directory (accept first arg as workspace, default to current dir)
if [ -n "${1:-}" ] && [ -d "${1:-}" ]; then
  WORKSPACE_DIR="$(cd "${1:-}" && pwd)"
  shift || true
else
  WORKSPACE_DIR="$(pwd)"
fi

# Build the tool if needed
if [ ! -f "$TOOL_DIR/stub-detector" ]; then
  echo "🔨 Building stub-detector..."
  cd "$TOOL_DIR"
  go build -o stub-detector main.go
  cd - > /dev/null
  echo "✅ Build complete"
fi

# Run the detector
echo "🔍 Scanning for stubbed implementations..."
"$TOOL_DIR/stub-detector" -workspace "$WORKSPACE_DIR" "$@"
