# AI Changelog / PR-Description Generator

A small CLI tool that reads your git commit history and uses an LLM to
generate a changelog, PR description, or standup summary.

Supports two providers:
- **GitHub Models (default, FREE, no credit card)** — since Innara is on
  GitHub, this is the natural default and ties directly into the same
  ecosystem as GitHub Copilot.
- **Anthropic Claude API (paid)** — optional, if you want Claude output
  and have API credits.

## Setup (free path — recommended)

```bash
cd ai-changelog-gen
npm install
```

Create a free GitHub personal access token:
1. Go to https://github.com/settings/personal-access-tokens
2. Generate a new fine-grained token
3. Under "Permissions", grant **models: read** (no other scopes needed)
4. Copy the token

```bash
export GITHUB_TOKEN=ghp_your_token_here
```

That's it — no billing, no credit card. GitHub Models gives free daily
quota (150 requests/day on the default model tier), which is more than
enough for changelog generation on a personal project.

## Setup (paid path — Claude)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node generate.js --provider anthropic
```

## Usage

```bash
# Changelog from the last 20 commits (default, uses free GitHub Models)
node generate.js

# Changelog between two tags/branches
node generate.js --from v1.2.0 --to HEAD

# PR description for a feature branch vs main
node generate.js --from origin/main --to HEAD --mode pr

# Quick standup summary from your last few commits
node generate.js --mode standup --count 5

# Save output straight to a file
node generate.js --mode changelog --out CHANGELOG.md

# Use Claude instead of the free default
node generate.js --provider anthropic
```

## Modes

- `changelog` (default) — user-facing release notes, grouped under
  Added / Fixed / Changed / Chore
- `pr` — a full PR description: summary, what changed, why, testing notes
- `standup` — 3-5 bullet first-person summary for daily updates

## Why this is useful as an "AI workflow automation" example

This turns raw commit history (which is often messy — "fix bug", "wip",
"update stuff") into structured, readable output automatically, as part
of your actual git workflow rather than a one-off prompt in a chat window.
It's a good candidate for wiring into a pre-release script or a CI step
that posts a draft changelog on tag creation — and running it on GitHub
Models means it's also a natural companion piece to any Copilot evidence
you share, since both live in the same GitHub ecosystem.
