#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required but not installed."
  echo "Install Node.js 20+ and rerun: npm run setup"
  exit 1
fi

echo "✅ Node detected: $(node -v)"
echo "✅ No dependencies required for this prototype"

echo
echo "Next steps:"
echo "  1) npm start"
echo "  2) npm run smoke"
