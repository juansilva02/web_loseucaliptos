#!/usr/bin/env bash
set -euo pipefail

# Remove only stale temporary files and package/cache data.
find /tmp -xdev -type f -mtime +1 -delete
find /tmp -xdev -type d -empty -mtime +1 -delete

if command -v apt-get >/dev/null 2>&1; then
  apt-get clean
fi

if command -v journalctl >/dev/null 2>&1; then
  journalctl --vacuum-time=14d >/dev/null
fi

# Dangling images are not used by any container and are safe to reclaim.
if command -v docker >/dev/null 2>&1; then
  docker image prune --force >/dev/null
fi
