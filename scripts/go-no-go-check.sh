#!/usr/bin/env bash
set -euo pipefail

# Fails fast when a required CLI is missing in the current environment.
require_command() {
  local command_name="$1"

  if ! command -v "$command_name" > /dev/null 2>&1; then
    echo "ERROR: Required command '$command_name' is not installed or not available in PATH." >&2
    exit 1
  fi
}

# Runs the agreed Go/No-Go smoke checks before handing the build to QA.
run_go_no_go_checks() {
  require_command dotnet
  require_command npm

  echo "[1/3] Running backend tests..."
  dotnet test Comments.sln --configuration Release

  echo "[2/3] Running frontend unit tests..."
  npm --prefix src/Comments.Web run test -- --watch=false --browsers=ChromeHeadless

  echo "[3/3] Running frontend e2e smoke tests..."
  npm --prefix src/Comments.Web run e2e

  echo "Go/No-Go checks completed successfully."
}

run_go_no_go_checks
