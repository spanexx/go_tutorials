#!/bin/bash

# Make the script executable
chmod +x find-stubs.sh

echo "Building stub-detector..."
cd tools
go build -o stub-detector main.go
echo "✅ stub-detector built successfully"

cd ..
echo ""
echo "📖 USAGE:"
echo ""
echo "Quick scan (text output):"
echo "  ./find-stubs.sh"
echo ""
echo "JSON output:"
echo "  ./find-stubs.sh -json"
echo ""
echo "Limit results:"
echo "  ./find-stubs.sh -max-items 100"
echo ""
echo "Specify workspace:"
echo "  ./find-stubs.sh /path/to/workspace"
echo ""
echo "Combined:"
echo "  ./find-stubs.sh -json -max-items 200"
echo ""
