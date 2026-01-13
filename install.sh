#!/usr/bin/env bash
# Ralph Installer
# Installs Ralph to ~/.ralph/

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

RALPH_HOME="${RALPH_HOME:-$HOME/.ralph}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${CYAN}Installing Ralph...${NC}"
echo ""

# Check requirements
check_requirement() {
    if ! command -v "$1" &>/dev/null; then
        echo -e "${RED}Error: $1 is required but not installed.${NC}"
        exit 1
    fi
}

echo "Checking requirements..."
check_requirement git
check_requirement tmux
check_requirement jq
echo -e "  ${GREEN}✓${NC} git, tmux, jq found"

# Check for Claude CLI
if command -v claude &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} claude CLI found"
else
    echo -e "  ${YELLOW}!${NC} claude CLI not found (required for workstreams)"
    echo "    Install from: https://claude.ai/claude-code"
fi

# Check for Node.js (optional, for REST API)
if command -v node &>/dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -ge 18 ]]; then
        echo -e "  ${GREEN}✓${NC} Node.js $(node -v) found"
    else
        echo -e "  ${YELLOW}!${NC} Node.js 18+ recommended (found $(node -v))"
    fi
else
    echo -e "  ${YELLOW}!${NC} Node.js not found (optional, for REST API)"
fi

echo ""

# Create directory structure
echo "Creating directory structure..."
mkdir -p "$RALPH_HOME"/{bin,projects,workstreams,state,logs,server}
echo -e "  ${GREEN}✓${NC} Created $RALPH_HOME/"

# Copy binaries
echo "Installing binaries..."
cp "$SCRIPT_DIR/bin/ralph" "$RALPH_HOME/bin/"
cp "$SCRIPT_DIR/bin/ralph-loop.sh" "$RALPH_HOME/bin/"
chmod +x "$RALPH_HOME/bin/ralph"
chmod +x "$RALPH_HOME/bin/ralph-loop.sh"
echo -e "  ${GREEN}✓${NC} Installed ralph and ralph-loop.sh"

# Copy server files
echo "Installing REST API server..."
cp "$SCRIPT_DIR/server/package.json" "$RALPH_HOME/server/"
cp "$SCRIPT_DIR/server/server.js" "$RALPH_HOME/server/"
echo -e "  ${GREEN}✓${NC} Installed server files"

# Install server dependencies (optional)
if command -v npm &>/dev/null; then
    echo "Installing server dependencies..."
    cd "$RALPH_HOME/server"
    npm install --silent 2>/dev/null || true
    cd - > /dev/null
    echo -e "  ${GREEN}✓${NC} Server dependencies installed"
fi

# Create default config if not exists
if [[ ! -f "$RALPH_HOME/config.yaml" ]]; then
    echo "Creating default configuration..."
    cat > "$RALPH_HOME/config.yaml" << 'EOF'
# Ralph Global Configuration
# ~/.ralph/config.yaml

# Default settings for all workstreams
defaults:
  max_iterations: 20
  base_branch: main

# Bark push notifications (iOS)
# https://github.com/Finb/Bark
# Get your URL from the Bark app and update below
notifications:
  bark:
    enabled: false
    url: ""
    events:
      - stuck      # No progress for 3+ iterations
      - question   # Ralph needs input
      - complete   # Workstream finished
      - error      # Iteration failed
      - recovered  # Auto-recovered orphaned workstream

# REST API server
server:
  port: 3847
  # api_key: <run 'ralph server key' to generate>

# Auto-recovery settings
recovery:
  auto: true
  notify: true

# Stuck detection
stuck:
  threshold: 3
  check_progress: true
EOF
    echo -e "  ${GREEN}✓${NC} Created config.yaml"
else
    echo -e "  ${YELLOW}!${NC} config.yaml already exists, skipping"
fi

# Install Claude Code skill (optional)
echo ""
echo "Installing Claude Code skill..."
SKILL_DIR="$HOME/.claude/skills/ralph"
if [[ -d "$SCRIPT_DIR/skills" ]]; then
    mkdir -p "$SKILL_DIR"
    cp "$SCRIPT_DIR/skills/"*.md "$SKILL_DIR/" 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Installed to $SKILL_DIR/"
else
    echo -e "  ${YELLOW}!${NC} Skills directory not found, skipping"
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Add Ralph to your PATH. Add this to ~/.zshrc or ~/.bashrc:"
echo ""
echo -e "   ${CYAN}export PATH=\"\$HOME/.ralph/bin:\$PATH\"${NC}"
echo ""
echo "2. Restart your shell or run:"
echo ""
echo -e "   ${CYAN}source ~/.zshrc${NC}"
echo ""
echo "3. Configure notifications (optional). Edit ~/.ralph/config.yaml:"
echo ""
echo "   - Set your Bark URL for iOS push notifications"
echo "   - Run 'ralph server key' to generate an API key"
echo ""
echo "4. Register your first project:"
echo ""
echo -e "   ${CYAN}cd ~/your-project${NC}"
echo -e "   ${CYAN}ralph projects add${NC}"
echo ""
echo "5. Read the docs:"
echo ""
echo "   - README.md - Quick start guide"
echo "   - docs/ARCHITECTURE.md - System design"
echo "   - docs/PHILOSOPHY.md - Design principles"
echo "   - skills/WORKFLOWS.md - Common workflows"
echo ""
echo -e "${GREEN}Happy autonomous coding!${NC}"
