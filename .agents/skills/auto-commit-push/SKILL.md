---
name: auto-commit-push
description: Commit and push a finished feature to its Git branch after verification. Use when the user invokes this skill to ship work, asks to commit and push when done, or enables automatic commit and push for the task or repository.
---

# Auto Commit and Push

Treat commit and push as the last step of the authorized feature. Creating or editing this skill does not publish the current work. Follow the requested branch and remote, or use the current branch and its configured upstream.

1. Check `git status --short --branch` and review the staged and unstaged diffs. Identify the feature's paths or hunks and preserve unrelated changes, including changes already staged by the user.
2. Run the feature checks and the repository's pre-commit checks. Follow `AGENTS.md` for `pnpm exec prettier --write` and `pnpm exec prettier --check` on the changed supported files. Review the diff again after formatting.
3. Stage the feature changes and inspect the exact commit contents. Write a concise commit message describing the outcome. If unrelated staged changes are on separate paths, `git commit --only -- <feature paths>` can commit complete feature files while preserving those staged changes. Use selective staging for mixed files and stop if the intended commit cannot be isolated. Skip an empty commit.
4. Fetch the destination branch and check the commits the push would publish. When the entire outgoing range is authorized, explicitly target the intended branch with `git push <remote> HEAD:<branch>`. For a new remote branch, set the upstream when the intended remote is clear. If the remote advances, follow the repository's usual merge or rebase workflow when the changes can be reconciled safely, then retry with a normal push. Keep any local commit if a conflict, branch protection, or unavailable credentials blocks the push.
5. Verify that the destination branch contains the commit. Report the commit hash, destination, and check results. If the push was blocked, report the exact blocker and the local commit hash.

On Windows, if `pnpm` is absent from `PATH`, use Corepack with a pnpm version supported by `package.json`. If the command shim misquotes paths with parentheses, run Corepack's JavaScript entrypoint through Node so paths pass through as separate arguments.
