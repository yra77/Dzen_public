#!/usr/bin/env bash
set -euo pipefail

REPORT_FILE=""

# Starts the local QA dependencies and validates that critical endpoints respond.
run_qa_stand_check() {
  echo "[1/4] Starting infrastructure services (sqlserver, rabbitmq, elasticsearch, comments-api)..."
  docker compose up -d sqlserver rabbitmq elasticsearch comments-api

  echo "[2/4] Waiting for API health endpoint..."
  wait_for_endpoint "http://localhost:5000/health" "Comments API health"

  echo "[3/4] Waiting for RabbitMQ management endpoint..."
  wait_for_endpoint "http://localhost:15672" "RabbitMQ management"

  echo "[4/4] Waiting for Elasticsearch cluster health endpoint..."
  wait_for_endpoint "http://localhost:9200/_cluster/health" "Elasticsearch cluster health"

  echo "Local QA stand is ready for manual testing."

  if [[ -n "$REPORT_FILE" ]]; then
    write_report "READY" "QA stand dependencies are reachable."
  fi
}

# Polls an HTTP endpoint with retries to avoid flaky startup timing.
wait_for_endpoint() {
  local endpoint="$1"
  local description="$2"
  local retries="30"
  local delay_seconds="3"

  for ((attempt = 1; attempt <= retries; attempt++)); do
    if curl --silent --show-error --fail "$endpoint" > /dev/null; then
      echo "  ✓ $description is reachable ($endpoint)"
      return 0
    fi

    echo "  ...waiting for $description (attempt $attempt/$retries)"
    sleep "$delay_seconds"
  done

  echo "ERROR: $description is not reachable after $retries attempts ($endpoint)." >&2
  return 1
}

# Writes machine-readable readiness evidence for QA handoff.
write_report() {
  local status="$1"
  local message="$2"
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  mkdir -p "$(dirname "$REPORT_FILE")"
  cat > "$REPORT_FILE" <<REPORT
{
  "check": "qa-stand",
  "status": "$status",
  "timestampUtc": "$timestamp",
  "message": "$message"
}
REPORT

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

run_qa_stand_check
