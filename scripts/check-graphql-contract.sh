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

# Checks whether an endpoint is currently reachable.
is_endpoint_available() {
  local endpoint="$1"

  curl --silent --fail --show-error "$endpoint" >/dev/null 2>&1
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

# Sends a GraphQL POST request and stores response JSON to a target file.
post_graphql() {
  local endpoint="$1"
  local payload="$2"
  local output_file="$3"

  curl --silent --show-error --fail \
    -H 'Content-Type: application/json' \
    -d "$payload" \
    "$endpoint" > "$output_file"
}

# Verifies that schema exposes required root fields used by SPA GraphQL operations.
validate_contract_fields() {
  local endpoint="$1"
  local introspection_payload

  introspection_payload='{"query":"{ __schema { queryType { fields { name } } mutationType { fields { name } } } }"}'

  local response_file
  response_file="$WORKDIR/introspection.json"

  post_graphql "$endpoint" "$introspection_payload" "$response_file"

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

# Verifies error shape for invalid GraphQL operations used in CI contract gate.
validate_negative_contract_cases() {
  local endpoint="$1"
  local invalid_query_payload
  local invalid_response_file

  # Unknown field must produce GraphQL validation errors without crashing endpoint.
  invalid_query_payload='{"query":"query ContractNegativeCase { unknownContractField }"}'
  invalid_response_file="$WORKDIR/negative-invalid-field.json"
  post_graphql "$endpoint" "$invalid_query_payload" "$invalid_response_file"

  if ! jq -e '.errors | type == "array" and length > 0' "$invalid_response_file" >/dev/null; then
    echo "ERROR: invalid field case did not return GraphQL errors array." >&2
    exit 1
  fi

  if ! jq -e '.errors[0].message | type == "string" and length > 0' "$invalid_response_file" >/dev/null; then
    echo "ERROR: invalid field case does not include error message in expected shape." >&2
    exit 1
  fi

  if ! jq -e '.errors[0].path == null or (.errors[0].path | type == "array")' "$invalid_response_file" >/dev/null; then
    echo "ERROR: invalid field case has incompatible error.path shape." >&2
    exit 1
  fi

  echo "GraphQL negative contract validation passed."
}

# Starts API when needed, performs schema and negative contract assertions, and tears everything down.
run_contract_check() {
  require_command dotnet
  require_command curl
  require_command jq

  mkdir -p "$WORKDIR"

  trap cleanup EXIT

  if is_endpoint_available "$API_URL/graphql"; then
    echo "GraphQL endpoint already available at '$API_URL/graphql'; using existing API instance."
  else
    # The contract script can self-host API for local/CI usage when no instance is running.
    ASPNETCORE_URLS="$API_URL" dotnet run --project src/Comments.Api/Comments.Api.csproj --configuration Release > "$API_LOG_FILE" 2>&1 &
    echo $! > "$API_PID_FILE"
  fi

  wait_for_graphql "$API_URL/graphql"
  validate_contract_fields "$API_URL/graphql"
  validate_negative_contract_cases "$API_URL/graphql"
}

run_contract_check
