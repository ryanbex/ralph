# Ralph Worker Container
# Runs Claude Code iterations for workstreams

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

# Copy the cloud-adapted loop script
COPY ralph-loop-cloud.sh /usr/local/bin/ralph-loop-cloud.sh
RUN chmod +x /usr/local/bin/ralph-loop-cloud.sh

# Copy entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set working directory
WORKDIR /workspace

# Environment variables (to be overridden at runtime)
ENV RALPH_ENV=dev
ENV WORKSTREAM_ID=""
ENV PROJECT_SLUG=""
ENV REPO_URL=""
ENV BRANCH=""
ENV MAX_ITERATIONS=20
ENV RALPH_API_URL=""
ENV RALPH_API_KEY=""
ENV PROMPT_BLOB_URL=""

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD echo "healthy" || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
