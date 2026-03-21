#!/usr/bin/env bash
set -euo pipefail

# Validates that the DB schema artifact exists and is not empty.
#
# Why this check exists:
# - The project uses `db-schema.mwb` as a delivery artifact in the handoff flow.
# - A zero-byte file is an invalid artifact and should fail CI/smoke checks early.
SCHEMA_FILE="${1:-db-schema.mwb}"

# Ensures the provided schema file path exists on disk.
ensure_schema_file_exists() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "ERROR: Schema artifact '$path' was not found." >&2
    exit 1
  fi
}

# Ensures the schema file has a non-zero size.
ensure_schema_file_is_not_empty() {
  local path="$1"
  if [[ ! -s "$path" ]]; then
    echo "ERROR: Schema artifact '$path' is empty (0 bytes)." >&2
    exit 1
  fi
}

# Runs the schema artifact validation checks.
run_schema_check() {
  ensure_schema_file_exists "$SCHEMA_FILE"
  ensure_schema_file_is_not_empty "$SCHEMA_FILE"
  echo "DB schema artifact check passed: '$SCHEMA_FILE' is present and non-empty."
}

run_schema_check
