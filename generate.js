#!/usr/bin/env node
/**
 * ai-changelog-gen
 * -----------------
 * Reads git commit history (and optionally the diff) between two refs
 * and asks an LLM to generate a structured changelog / release notes /
 * PR description from it.
 *
 * USAGE
 *   node generate.js                        # last 20 commits vs HEAD
 *   node generate.js --from v1.2.0 --to HEAD
 *   node generate.js --from origin/main --to HEAD --mode pr
 *   node generate.js --mode changelog --out CHANGELOG.md
 *   node generate.js --provider anthropic   # use Claude instead of the free default
 *
 * PROVIDERS
 *   github     (default, FREE) -> GitHub Models API, no credit card required.
 *              Requires: export GITHUB_TOKEN=ghp_...  (a PAT with "models: read" permission,
 *              created at https://github.com/settings/personal-access-tokens)
 *   anthropic  -> Claude API (paid, requires credits in console.anthropic.com)
 *              Requires: export ANTHROPIC_API_KEY=sk-ant-...
 *
 * MODES
 *   changelog  -> user-facing release notes grouped by feature/fix/chore (default)
 *   pr         -> a PR description: summary, what changed, why, testing notes
 *   standup    -> a short "what I did" summary, useful for daily standups
 */

import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ---------- CLI args ----------
function parseArgs(argv) {
  const args = { from: null, to: "HEAD", mode: "changelog", out: null, count: 20, provider: "github" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") args.from = argv[++i];
    else if (a === "--to") args.to = argv[++i];
    else if (a === "--mode") args.mode = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--count") args.count = parseInt(argv[++i], 10);
    else if (a === "--provider") args.provider = argv[++i];
  }
  return args;
}

function sh(cmd) {
  return execSync(cmd, { encoding: "utf-8", maxBuffer: 1024 * 1024 * 20 });
}

function getGitLog(from, to, count) {
  const range = from ? `${from}..${to}` : "";
  const countFlag = from ? "" : `-n ${count}`;
  const cmd = `git log ${range} ${countFlag} --pretty=format:"- %h %s (%an, %ad)" --date=short`;
  try {
    return sh(cmd).trim();
  } catch (e) {
    throw new Error(`Failed to read git log. Are you inside a git repo? (${e.message})`);
  }
}

function getGitDiffStat(from, to) {
  if (!from) return "";
  try {
    return sh(`git diff --stat ${from}..${to}`).trim();
  } catch {
    return "";
  }
}

function buildPrompt(mode, log, diffStat) {
  const shared = `Here is the raw git commit log:\n\n${log}\n\n${
    diffStat ? `File change summary:\n\n${diffStat}\n\n` : ""
  }`;

  if (mode === "pr") {
    return `${shared}Write a clear, professional pull request description from this history. Include:
1. A one-paragraph summary of what this PR does
2. A "What changed" section as bullet points, grouped logically (not just a copy of commit messages)
3. A "Why" section explaining likely motivation/context based on the commits
4. A "Testing notes" section suggesting what a reviewer should verify
Keep it concise and skip anything not supported by the log. Output in Markdown.`;
  }

  if (mode === "standup") {
    return `${shared}Summarize this as a short daily standup update: 3-5 bullet points of what was done, written in first person, plain and direct, no fluff.`;
  }

  // default: changelog
  return `${shared}Generate user-facing release notes from this history. Group changes under "Added", "Fixed", "Changed", and "Chore/Internal" headings (omit empty ones). Write each line as a clear, non-technical benefit-oriented statement where possible, but keep it accurate to the commits. Output in Markdown suitable for a CHANGELOG.md file.`;
}

async function callAnthropic(prompt) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY environment variable is not set.");
    console.error("Get one at https://console.anthropic.com (requires paid credits).");
    process.exit(1);
  }
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env automatically
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

async function callGitHubModels(prompt) {
  if (!process.env.GITHUB_TOKEN) {
    console.error("Error: GITHUB_TOKEN environment variable is not set.");
    console.error("Create a free PAT (with 'models: read' permission) at:");
    console.error("  https://github.com/settings/personal-access-tokens");
    console.error("Then run: export GITHUB_TOKEN=ghp_...");
    process.exit(1);
  }
  // GitHub Models exposes an OpenAI-compatible endpoint — free, no credit card.
  const client = new OpenAI({
    baseURL: "https://models.github.ai/inference",
    apiKey: process.env.GITHUB_TOKEN,
  });
  const response = await client.chat.completions.create({
    model: "openai/gpt-4o-mini", // small + fast; well within the free daily quota
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0]?.message?.content ?? "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  console.log(`Reading git history (${args.from ? `${args.from}..${args.to}` : `last ${args.count} commits`})...`);
  const log = getGitLog(args.from, args.to, args.count);
  if (!log) {
    console.error("No commits found in that range.");
    process.exit(1);
  }
  const diffStat = getGitDiffStat(args.from, args.to);

  const prompt = buildPrompt(args.mode, log, diffStat);

  console.log(`Calling ${args.provider} to generate "${args.mode}" output...`);
  const text = args.provider === "anthropic" ? await callAnthropic(prompt) : await callGitHubModels(prompt);

  console.log("\n--------- GENERATED OUTPUT ---------\n");
  console.log(text);
  console.log("\n-------------------------------------\n");

  if (args.out) {
    writeFileSync(args.out, text, "utf-8");
    console.log(`Saved to ${args.out}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
