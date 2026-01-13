#!/bin/bash
# Ralph Format Hook
# Formats shell files after Edit/Write operations

FILE="$CLAUDE_FILE"

if [ -z "$FILE" ]; then
  exit 0
fi

# Only format shell scripts
case "$FILE" in
  *.sh | */bin/ralph | */bin/ralph-loop.sh)
    if command -v shfmt &>/dev/null; then
      shfmt -w -i 2 -ci "$FILE" >/dev/null 2>&1
    fi
    ;;
esac

exit 0
