#!/usr/bin/env bash
set -euo pipefail

REPORT_FILE=""

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

  echo "[1/4] Running backend tests..."
  dotnet test Comments.sln --configuration Release

  echo "[2/4] Running strict Angular production build check..."
  ./scripts/check-angular-build.sh

  echo "[3/4] Running frontend unit tests..."
  npm --prefix src/Comments.Web run test -- --watch=false --browsers=ChromeHeadless

  echo "[4/4] Running frontend e2e smoke tests..."
  npm --prefix src/Comments.Web run e2e

  echo "Go/No-Go checks completed successfully."

  if [[ -n "$REPORT_FILE" ]]; then
    write_report "GO" "Go/No-Go checks completed successfully."
  fi
}

# Writes machine-readable execution evidence for QA handoff.
write_report() {
  local status="$1"
  local message="$2"
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  mkdir -p "$(dirname "$REPORT_FILE")"
  cat > "$REPORT_FILE" <<EOF
{
  "check": "go-no-go",
  "status": "$status",
  "timestampUtc": "$timestamp",
  "message": "$message"
}
EOF

  echo "Report saved to: $REPORT_FILE"
}

# Parses optional CLI flags for report export.
parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --report-file)
        REPORT_FILE="$2"
        shift 2
        ;;
      *)
        echo "ERROR: Unknown argument '$1'. Supported flags: --report-file <path>." >&2
        exit 1
        ;;
    esac
  done
}

parse_args "$@"

run_go_no_go_checks
