# Ralph Worker Container
# Runs Claude Code iterations for workstreams on Fly.io

FROM ubuntu:22.04

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    jq \
    ca-certificates \
    gnupg \
    unzip \
    openssh-client \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Create workspace directory
RUN mkdir -p /workspace

# Copy scripts
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY ralph-loop-cloud.sh /usr/local/bin/ralph-loop-cloud.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/ralph-loop-cloud.sh

# Set working directory
WORKDIR /workspace

# Environment variables (to be provided at runtime by Fly.io Machines API)
# Required:
#   WORKSTREAM_ID - UUID of the workstream
#   GITHUB_REPO_URL - Git repository URL
#   PROMPT_BLOB_URL - URL to download PROMPT.md
#   ANTHROPIC_API_KEY - Anthropic API key for Claude
# Optional:
#   BASE_BRANCH - Base branch (default: main)
#   MAX_ITERATIONS - Max iterations (default: 20)
#   RALPH_API_URL - API URL for callbacks (default: http://localhost:3000)
#   PROGRESS_BLOB_URL - URL to download existing PROGRESS.md

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
