#!/usr/bin/env bash
set -euo pipefail

API_URL="${GRAPHQL_CONTRACT_API_URL:-http://127.0.0.1:5099}"
WORKDIR="${GRAPHQL_CONTRACT_WORKDIR:-/tmp/comments-graphql-contract}"
API_LOG_FILE="$WORKDIR/api.log"
API_PID_FILE="$WORKDIR/api.pid"

# Stops a locally started API process when the script exits.
cleanup() {
  if [[ -f "$API_PID_FILE" ]]; then
    local pid
    pid="$(cat "$API_PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  fi
}

# Fails fast if a required command is not available.
require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "ERROR: required command '$command_name' is not available in PATH." >&2
    exit 1
  fi
}

# Polls GraphQL endpoint until it becomes reachable.
wait_for_graphql() {
  local endpoint="$1"

  for attempt in {1..60}; do
    if curl --silent --fail --show-error "$endpoint" >/dev/null; then
      return 0
    fi

    sleep 1
  done

  echo "ERROR: GraphQL endpoint '$endpoint' did not become available in time." >&2
  cat "$API_LOG_FILE" >&2 || true
  exit 1
}

# Verifies that schema exposes required root fields used by SPA GraphQL operations.
validate_contract_fields() {
  local endpoint="$1"
  local introspection_payload

  introspection_payload='{"query":"{ __schema { queryType { fields { name } } mutationType { fields { name } } } }"}'

  local response_file
  response_file="$WORKDIR/introspection.json"

  curl --silent --show-error --fail \
    -H 'Content-Type: application/json' \
    -d "$introspection_payload" \
    "$endpoint" > "$response_file"

  local missing=0

  local required_query_fields=(
    commentsPage
    commentTree
    searchComments
    previewComment
    captchaImage
    attachmentTextPreview
  )

  local required_mutation_fields=(
    createComment
    addReply
  )

  for field_name in "${required_query_fields[@]}"; do
    if ! jq -e --arg field "$field_name" '.data.__schema.queryType.fields[] | select(.name == $field)' "$response_file" >/dev/null; then
      echo "ERROR: required query field '$field_name' is missing in GraphQL schema." >&2
      missing=1
    fi
  done

  for field_name in "${required_mutation_fields[@]}"; do
    if ! jq -e --arg field "$field_name" '.data.__schema.mutationType.fields[] | select(.name == $field)' "$response_file" >/dev/null; then
      echo "ERROR: required mutation field '$field_name' is missing in GraphQL schema." >&2
      missing=1
    fi
  done

  if [[ "$missing" -ne 0 ]]; then
    echo "GraphQL contract validation failed." >&2
    exit 1
  fi

  echo "GraphQL contract validation passed."
}

# Starts API, performs schema contract assertions, and tears everything down.
run_contract_check() {
  require_command dotnet
  require_command curl
  require_command jq

  mkdir -p "$WORKDIR"

  trap cleanup EXIT

  ASPNETCORE_URLS="$API_URL" dotnet run --project src/Comments.Api/Comments.Api.csproj --configuration Release > "$API_LOG_FILE" 2>&1 &
  echo $! > "$API_PID_FILE"

  wait_for_graphql "$API_URL/graphql"
  validate_contract_fields "$API_URL/graphql"
}

run_contract_check
