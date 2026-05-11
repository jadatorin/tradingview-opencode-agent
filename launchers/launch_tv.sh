#!/bin/bash
#
# Auto-detect and launch TradingView for macOS/Linux
#

set -e

PORT=9222
NO_WAIT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --port)
            PORT="$2"
            shift 2
            ;;
        --no-wait)
            NO_WAIT=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--port PORT] [--no-wait]"
            echo "  --port PORT    CDP port (default: 9222)"
            echo "  --no-wait      Don't wait for CDP connection"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*)  echo "linux" ;;
        *)       echo "unknown" ;;
    esac
}

# Find TradingView installation
find_tradingview() {
    local os=$(detect_os)

    case $os in
        macos)
            if [[ -d "/Applications/TradingView.app" ]]; then
                echo "/Applications/TradingView.app"
            elif [[ -d "$HOME/Applications/TradingView.app" ]]; then
                echo "$HOME/Applications/TradingView.app"
            fi
            ;;
        linux)
            local paths=(
                "$HOME/.local/share/TradingView"
                "$HOME/.local/bin/TradingView"
                "/opt/TradingView"
                "/usr/local/TradingView"
            )
            for path in "${paths[@]}"; do
                if [[ -d "$path" ]]; then
                    echo "$path"
                    return
                fi
            done
            ;;
    esac
}

# Check if CDP is active
check_cdp() {
    local port=$1
    if curl -s "http://localhost:$port/json" > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Launch TradingView with CDP
launch_with_cdp() {
    local tv_path=$1
    local port=$2
    local os=$(detect_os)

    case $os in
        macos)
            open -a "TradingView" --args "--remote-debugging-port=$port" 2>/dev/null || \
            open "$tv_path"
            ;;
        linux)
            if command -v xdg-open &> /dev/null; then
                "$tv_path/TradingView" "--remote-debugging-port=$port" &
            else
                echo "Error: xdg-open not found. Install xdg-utils."
                exit 1
            fi
            ;;
    esac
}

# Main execution
echo "Detecting OS: $(detect_os)"
echo "Searching for TradingView..."

TV_PATH=$(find_tradingview)

if [[ -z "$TV_PATH" ]]; then
    echo "Error: TradingView not found"
    exit 1
fi

echo "Found: $TV_PATH"

# Check if already running with CDP
if check_cdp $PORT; then
    echo "TradingView already running with CDP on port $PORT"
    echo "{\"success\":true,\"url\":\"http://localhost:$PORT/json\",\"port\":$PORT,\"path\":\"$TV_PATH\"}"
    exit 0
fi

# Launch
echo "Launching TradingView with CDP on port $PORT..."
launch_with_cdp "$TV_PATH" $PORT

# Wait for CDP (unless --no-wait)
if [[ "$NO_WAIT" == "false" ]]; then
    echo "Waiting for CDP connection..."
    for i in {1..10}; do
        if check_cdp $PORT; then
            echo "CDP active!"
            echo "{\"success\":true,\"url\":\"http://localhost:$PORT/json\",\"port\":$PORT,\"path\":\"$TV_PATH\"}"
            exit 0
        fi
        sleep 1
    done
    echo "Warning: CDP not active after 10 seconds"
    echo "{\"success\":false,\"message\":\"CDP connection not established\",\"port\":$PORT}"
    exit 1
fi

echo "{\"success\":true,\"url\":\"http://localhost:$PORT/json\",\"port\":$PORT,\"path\":\"$TV_PATH\"}"
exit 0