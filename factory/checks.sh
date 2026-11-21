#!/usr/bin/env bash
# The repo's checks. Exit 0 only when the branch is fit to review.
#
# The gate runs this script from the main checkout with the job's worktree as
# the working directory. Keep it fast, deterministic and non-interactive: no
# watch modes, no prompts, nothing that rewrites files.
#
# There is no test suite or linter in this project. The checks are a clean
# install (when needed), a strict typecheck and a production build of all three
# workspaces. Build output goes to the gitignored dist/ folders.
set -euo pipefail

# Fresh worktree, or a branch that changed the lockfile: install from the lock.
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm ci --prefer-offline --no-audit --no-fund
fi

# Typecheck the client without `tsc -b`, which rewrites the committed
# client/*.tsbuildinfo files.
npx --no-install tsc -p client/tsconfig.app.json
npx --no-install tsc -p client/tsconfig.node.json

# Production builds (server and cli tsc also typecheck those workspaces).
(cd client && npx --no-install vite build)
npm run build -w server
npm run build -w cli
