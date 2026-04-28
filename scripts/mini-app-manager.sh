#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.runtime/mini-app-manager"
PID_APP_FILE="$STATE_DIR/mini-app.pid"
PID_TUNNEL_FILE="$STATE_DIR/tunnel.pid"
APP_LOG="$STATE_DIR/mini-app.log"
TUNNEL_LOG="$STATE_DIR/tunnel.log"
TUNNEL_BIN="$ROOT_DIR/.tools/cloudflared/cloudflared"
LOCAL_URL="http://127.0.0.1:5173"

mkdir -p "$STATE_DIR"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

resolve_npm_bin() {
  local npm_bin=""
  npm_bin="$(command -v npm 2>/dev/null || true)"
  if [[ -n "$npm_bin" ]]; then
    printf '%s' "$npm_bin"
    return 0
  fi

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck disable=SC1090,SC1091
    . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
    npm_bin="$(command -v npm 2>/dev/null || true)"
    if [[ -n "$npm_bin" ]]; then
      printf '%s' "$npm_bin"
      return 0
    fi
  fi

  # Direct glob fallback: find any npm under ~/.nvm/versions
  local p
  for p in "$HOME/.nvm/versions/node"/*/bin/npm; do
    if [[ -x "$p" ]]; then
      printf '%s' "$p"
      return 0
    fi
  done

  for p in /opt/homebrew/bin/npm /usr/local/bin/npm /usr/bin/npm; do
    if [[ -x "$p" ]]; then
      printf '%s' "$p"
      return 0
    fi
  done

  return 1
}

print_usage() {
  cat <<'EOF'
Mini App Manager

Usage:
  ./scripts/mini-app-manager.sh               # Interactive app mode (menu)
  ./scripts/mini-app-manager.sh start|up       # Start mini server + renderer + tunnel
  ./scripts/mini-app-manager.sh stop|down      # Stop all managed processes
  ./scripts/mini-app-manager.sh restart|re      # Restart everything
  ./scripts/mini-app-manager.sh status|st       # Check health and process state
  ./scripts/mini-app-manager.sh url|link        # Print current public tunnel URL
  ./scripts/mini-app-manager.sh open            # Open current link in browser
  ./scripts/mini-app-manager.sh doctor          # Diagnose and auto-fix common issues
  ./scripts/mini-app-manager.sh ensure          # Start only missing parts
  ./scripts/mini-app-manager.sh logs|log        # Tail logs for app and tunnel

Notes:
  - This script manages only processes it started itself (via PID files).
  - If tunnel URL rotates, run "url" again to get the latest one.
EOF
}

is_pid_alive() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1
}

is_port_listening() {
  local port="$1"
  [[ -n "$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)" ]]
}

wait_for_port() {
  local port="$1"
  local timeout_sec="${2:-35}"
  local i=0
  while (( i < timeout_sec )); do
    if is_port_listening "$port"; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  return 1
}

renderer_health_ok() {
  curl -fsS "http://127.0.0.1:5173" >/dev/null 2>&1
}

api_health_ok() {
  curl -fsS "http://127.0.0.1:8787/api/health" >/dev/null 2>&1
}

read_pid() {
  local file="$1"
  [[ -f "$file" ]] || return 1
  local pid
  pid="$(tr -d '[:space:]' < "$file")"
  [[ -n "$pid" ]] || return 1
  printf '%s' "$pid"
}

start_app() {
  local pid=""
  if pid="$(read_pid "$PID_APP_FILE" 2>/dev/null)" && is_pid_alive "$pid"; then
    echo "mini-app already running (pid $pid)"
    return 0
  fi

  echo "ensuring ports 5173 and 8787 are free..."
  local listeners=""
  listeners="$(lsof -tiTCP:5173 -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$listeners" ]]; then
    echo "$listeners" | xargs kill >/dev/null 2>&1 || true
  fi
  listeners="$(lsof -tiTCP:8787 -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$listeners" ]]; then
    echo "$listeners" | xargs kill >/dev/null 2>&1 || true
  fi

  echo "starting mini-app (server + renderer)..."
  : > "$APP_LOG"
  local npm_bin=""
  npm_bin="$(resolve_npm_bin 2>/dev/null || true)"
  if [[ -z "$npm_bin" ]]; then
    echo "npm not found in PATH."
    echo "Install Node.js / npm or initialize nvm in this shell."
    return 1
  fi
  # Ensure node (same bin dir as npm) is on PATH for npm subprocesses
  export PATH="$(dirname "$npm_bin"):$PATH"
  (
    cd "$ROOT_DIR"
    nohup "$npm_bin" run dev:mini-app >>"$APP_LOG" 2>&1 &
    echo $! > "$PID_APP_FILE"
  )
  sleep 1

  if ! wait_for_port 8787 40; then
    echo "mini-api (8787) failed to start in time."
    echo "Last mini-app log lines:"
    tail -n 40 "$APP_LOG" || true
    return 1
  fi
  if ! wait_for_port 5173 45; then
    echo "renderer (5173) failed to start in time."
    echo "Last mini-app log lines:"
    tail -n 40 "$APP_LOG" || true
    return 1
  fi
  if ! api_health_ok || ! renderer_health_ok; then
    echo "mini-app started but health-check failed."
    echo "Last mini-app log lines:"
    tail -n 40 "$APP_LOG" || true
    return 1
  fi
}

start_tunnel() {
  local pid=""
  if pid="$(read_pid "$PID_TUNNEL_FILE" 2>/dev/null)" && is_pid_alive "$pid"; then
    echo "tunnel already running (pid $pid)"
    return 0
  fi

  if [[ ! -x "$TUNNEL_BIN" ]]; then
    echo "cloudflared not found/executable at $TUNNEL_BIN"
    echo "fix: chmod +x ./.tools/cloudflared/cloudflared"
    exit 1
  fi

  echo "starting cloudflare tunnel..."
  : > "$TUNNEL_LOG"
  (
    cd "$ROOT_DIR"
    nohup "$TUNNEL_BIN" tunnel --url "$LOCAL_URL" >>"$TUNNEL_LOG" 2>&1 &
    echo $! > "$PID_TUNNEL_FILE"
  )
  sleep 3
}

stop_pid_file() {
  local file="$1"
  local label="$2"
  local pid=""
  if ! pid="$(read_pid "$file" 2>/dev/null)"; then
    echo "$label not running"
    return 0
  fi
  if ! is_pid_alive "$pid"; then
    echo "$label stale pid ($pid), cleaning"
    rm -f "$file"
    return 0
  fi
  echo "stopping $label (pid $pid)..."
  kill "$pid" >/dev/null 2>&1 || true
  sleep 1
  if is_pid_alive "$pid"; then
    kill -9 "$pid" >/dev/null 2>&1 || true
  fi
  rm -f "$file"
}

extract_tunnel_url() {
  [[ -f "$TUNNEL_LOG" ]] || return 1
  awk 'match($0, /https:\/\/[A-Za-z0-9.-]+trycloudflare\.com/) { print substr($0, RSTART, RLENGTH) }' "$TUNNEL_LOG" | tail -n 1
}

wait_for_url() {
  local i
  for i in {1..20}; do
    local url=""
    if url="$(extract_tunnel_url 2>/dev/null)" && [[ -n "$url" ]]; then
      printf '%s' "$url"
      return 0
    fi
    sleep 1
  done
  return 1
}

cmd_start() {
  start_app || return 1
  start_tunnel
  local url=""
  if url="$(wait_for_url 2>/dev/null)"; then
    echo ""
    echo "Public Mini App URL:"
    echo "$url"
  else
    echo ""
    echo "Tunnel started, but URL not detected yet."
    echo "Run: ./scripts/mini-app-manager.sh url"
  fi
}

cmd_link() {
  cmd_url
}

cmd_stop() {
  stop_pid_file "$PID_TUNNEL_FILE" "tunnel"
  stop_pid_file "$PID_APP_FILE" "mini-app"
}

cmd_status() {
  local app_pid="" tunnel_pid=""
  if app_pid="$(read_pid "$PID_APP_FILE" 2>/dev/null)" && is_pid_alive "$app_pid"; then
    echo "mini-app: running (pid $app_pid)"
  else
    local renderer_listener server_listener
    renderer_listener="$(lsof -tiTCP:5173 -sTCP:LISTEN 2>/dev/null || true)"
    server_listener="$(lsof -tiTCP:8787 -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$renderer_listener" && -n "$server_listener" ]]; then
      echo "mini-app: running (external pids: 5173=$renderer_listener, 8787=$server_listener)"
    else
      echo "mini-app: stopped"
    fi
  fi
  if tunnel_pid="$(read_pid "$PID_TUNNEL_FILE" 2>/dev/null)" && is_pid_alive "$tunnel_pid"; then
    echo "tunnel:   running (pid $tunnel_pid)"
  else
    echo "tunnel:   stopped"
  fi
  local url=""
  if url="$(extract_tunnel_url 2>/dev/null)" && [[ -n "$url" ]]; then
    echo "url:      $url"
  else
    echo "url:      unavailable"
  fi
}

cmd_url() {
  local url=""
  if url="$(extract_tunnel_url 2>/dev/null)" && [[ -n "$url" ]]; then
    echo "$url"
    exit 0
  fi
  echo "No tunnel URL found yet. Check tunnel logs:"
  echo "  $TUNNEL_LOG"
  exit 1
}

cmd_ensure() {
  start_app || return 1
  start_tunnel
  cmd_status
}

cmd_open() {
  local url=""
  if ! url="$(extract_tunnel_url 2>/dev/null)" || [[ -z "$url" ]]; then
    echo "No URL yet. Run: ./scripts/mini-app-manager.sh up"
    return 1
  fi
  echo "$url"
  if command -v pbcopy >/dev/null 2>&1; then
    printf '%s' "$url" | pbcopy
    echo "(copied to clipboard)"
  fi
  open "$url" >/dev/null 2>&1 || true
}

cmd_doctor() {
  echo "diagnosing..."
  if ! resolve_npm_bin >/dev/null 2>&1; then
    echo "npm is not available in PATH."
    echo "Install Node.js / npm or initialize nvm in this shell."
    return 1
  fi
  local app_ok="0"
  local tunnel_ok="0"
  if is_port_listening 5173 && is_port_listening 8787 && renderer_health_ok && api_health_ok; then
    app_ok="1"
  fi
  local tunnel_pid=""
  if tunnel_pid="$(read_pid "$PID_TUNNEL_FILE" 2>/dev/null)" && is_pid_alive "$tunnel_pid"; then
    tunnel_ok="1"
  fi
  if [[ "$app_ok" == "1" && "$tunnel_ok" == "1" ]]; then
    echo "everything looks healthy."
    cmd_status
    return 0
  fi
  echo "auto-fixing by restart..."
  cmd_stop
  cmd_start
}

cmd_logs() {
  touch "$APP_LOG" "$TUNNEL_LOG"
  tail -n 80 -f "$APP_LOG" "$TUNNEL_LOG"
}

run_app_menu() {
  while true; do
    clear
    echo "=============================="
    echo " AURA Mini App Manager"
    echo "=============================="
    cmd_status || true
    echo ""
    echo "[1] Up       [2] Down     [3] Restart"
    echo "[4] Status   [5] Link     [6] Open in browser"
    echo "[7] Logs     [8] Doctor   [q] Quit"
    echo ""
    printf "Choose: "
    local key=""
    IFS= read -rsn1 key
    echo ""
    case "$key" in
      1) cmd_start || true; sleep 2 ;;
      2) cmd_stop || true; sleep 1 ;;
      3) cmd_stop || true; cmd_start || true; sleep 2 ;;
      4) cmd_status || true; read -r -p "Press Enter..." _ ;;
      5) cmd_url || true; read -r -p "Press Enter..." _ ;;
      6) cmd_open || true; read -r -p "Press Enter..." _ ;;
      7) cmd_logs; return 0 ;;
      8) cmd_doctor || true; read -r -p "Press Enter..." _ ;;
      q|Q) return 0 ;;
      *) ;;
    esac
  done
}

cmd="${1:-}"
case "$cmd" in
  start|up) cmd_start ;;
  stop|down) cmd_stop ;;
  restart|re) cmd_stop; cmd_start ;;
  status|st) cmd_status ;;
  url|link) cmd_url ;;
  open) cmd_open ;;
  doctor) cmd_doctor ;;
  ensure) cmd_ensure ;;
  logs|log) cmd_logs ;;
  app|"") run_app_menu ;;
  *) print_usage ;;
esac
