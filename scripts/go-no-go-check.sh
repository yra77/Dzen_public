#!/usr/bin/env bash
set -euo pipefail

# Runs the agreed Go/No-Go smoke checks before handing the build to QA.
run_go_no_go_checks() {
  echo "[1/3] Running backend tests..."
  dotnet test Comments.sln --configuration Release 

  echo "[2/3] Running frontend unit tests..."
  npm --prefix src/Comments.Web run test -- --watch=false --browsers=ChromeHeadless

  echo "[3/3] Running frontend e2e smoke tests..."
  npm --prefix src/Comments.Web run e2e

  echo "Go/No-Go checks completed successfully."
}

run_go_no_go_checks
