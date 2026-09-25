#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

mkdir -p "$tmp_dir/bin" "$tmp_dir/home/dev/jordangarrison/nix-config"
log="$tmp_dir/commands.log"

cat > "$tmp_dir/bin/hostname" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "$TEST_HOSTNAME"
EOF

cat > "$tmp_dir/bin/nix" <<'EOF'
#!/usr/bin/env bash
printf 'nix:%s:%s\n' "$PWD" "$*" >> "$COMMAND_LOG"
EOF

cat > "$tmp_dir/bin/nh" <<'EOF'
#!/usr/bin/env bash
printf 'nh:%s:%s\n' "$PWD" "$*" >> "$COMMAND_LOG"
EOF

cat > "$tmp_dir/bin/ssh" <<'EOF'
#!/usr/bin/env bash
printf 'ssh:%s\n' "$*" >> "$COMMAND_LOG"
EOF

chmod +x "$tmp_dir/bin/hostname" "$tmp_dir/bin/nix" "$tmp_dir/bin/nh" "$tmp_dir/bin/ssh"

run_deploy() {
  : > "$log"
  env \
    PATH="$tmp_dir/bin:$PATH" \
    HOME="$tmp_dir/home" \
    TEST_HOSTNAME="$1" \
    COMMAND_LOG="$log" \
    "$repo_root/scripts/deploy" deployment-host
}

run_deploy deployment-host
expected_local=$(printf 'nix:%s:flake update tic-tac-toe-4-in-a-row\nnh:%s:os test . --no-nom' \
  "$tmp_dir/home/dev/jordangarrison/nix-config" \
  "$tmp_dir/home/dev/jordangarrison/nix-config")
actual=$(<"$log")
if [[ "$actual" != "$expected_local" ]]; then
  printf 'local deploy mismatch\nexpected:\n%s\nactual:\n%s\n' "$expected_local" "$actual" >&2
  exit 1
fi

run_deploy another-host
dollar='$'
expected_remote="ssh:deployment-host cd \"${dollar}HOME/dev/jordangarrison/nix-config\" && nix flake update tic-tac-toe-4-in-a-row && nh os test . --no-nom"
actual=$(<"$log")
if [[ "$actual" != "$expected_remote" ]]; then
  printf 'remote deploy mismatch\nexpected:\n%s\nactual:\n%s\n' "$expected_remote" "$actual" >&2
  exit 1
fi

printf 'deploy behavior tests passed\n'
