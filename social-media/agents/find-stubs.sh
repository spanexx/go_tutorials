#!/bin/bash
# Integration script to use stub-detector with ralph-critic.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOL_DIR="$SCRIPT_DIR/tools"
WORKSPACE_DIR="${1:-.}"

# Build the tool if needed
if [ ! -f "$TOOL_DIR/stub-detector" ]; then
  echo "🔨 Building stub-detector..."
  cd "$TOOL_DIR"
  go build -o stub-detector main.go
  cd - > /dev/null
  echo "✅ Build complete"
fi

# Shift first arg if it's a directory (workspace)
if [ -d "$WORKSPACE_DIR" ]; then
  shift 2>/dev/null || true
fi

# Run the detector
echo "🔍 Scanning for stubbed implementations..."
"$TOOL_DIR/stub-detector" -workspace "$WORKSPACE_DIR" "$@"
