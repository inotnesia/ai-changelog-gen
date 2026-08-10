# AI Changelog / PR-Description Generator

A small CLI tool that reads your git commit history and uses an LLM to
generate a changelog, PR description, or standup summary.

Supports two providers:
- **Google Gemini API (default, FREE, no credit card, no expiration)** — via
  Google AI Studio.
- **Anthropic Claude API (paid)** — optional, if you want Claude output
  and have API credits.

> **Note:** This tool originally used GitHub Models as its free default.
> GitHub permanently retired that service on July 30, 2026. The script now
> uses Google Gemini's free tier instead, which as of writing has no
> expiration date and requires no credit card.

## Setup (free path — recommended)

```bash
cd ai-changelog-gen
npm install
```

Get a free Gemini API key:
1. Go to https://aistudio.google.com/apikey
2. Sign in with any Google account
3. Click **Create API key** (no billing setup required for the free tier)
4. Copy the key

```bash
export GEMINI_API_KEY=your_key_here
```

That's it — no billing, no credit card. The free tier currently allows
1,500 requests/day on `gemini-2.5-flash`, far more than you'll need for
changelog generation on a personal project.

**Note on data usage:** Google's free tier terms allow prompts/responses
sent through the free tier to be used to improve their products. If that's
a concern for proprietary code, keep diffs/logs high-level, or use the
paid Anthropic path instead, which doesn't have that clause.

## Setup (paid path — Claude)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node generate.js --provider anthropic
```

## Usage

```bash
# Changelog from the last 20 commits (default, uses free Gemini)
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
that posts a draft changelog on tag creation.
