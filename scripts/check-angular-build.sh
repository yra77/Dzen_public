#!/usr/bin/env bash
set -euo pipefail

# Runs production Angular build and fails when CLI output contains warnings.
run_angular_build_quality_gate() {
  local log_file
  log_file="$(mktemp)"

  echo "Running Angular production build quality gate..."

  if ! npm --prefix src/Comments.Web run build -- --configuration production 2>&1 | tee "$log_file"; then
    echo "ERROR: Angular production build failed." >&2
    rm -f "$log_file"
    return 1
  fi

  # Keep warning detection explicit to enforce a strict no-warning policy from the plan.
  if rg -n "(^|\s)WARNING(\s|:|$)" "$log_file" > /dev/null; then
    echo "ERROR: Angular build emitted warnings. Resolve warnings before merge." >&2
    rm -f "$log_file"
    return 1
  fi

  echo "Angular production build completed without warnings."
  rm -f "$log_file"
}

run_angular_build_quality_gate
