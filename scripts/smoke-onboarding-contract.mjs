#!/usr/bin/env node

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const chromeCandidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "google-chrome",
  "chromium",
  "chromium-browser",
].filter(Boolean);

const baseUrl = (process.env.APP_BASE_URL ?? "https://card-reader-xi.vercel.app").replace(/\/$/, "");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 30000);
const domOutputDir = process.env.SMOKE_DOM_DIR;

const states = [
  {
    slug: "manual-card",
    label: "Signed-in manual card entry",
    mustContain: ["Enter card details", "American Express", "Gold Card", "3007", "Add card"],
  },
  {
    slug: "plaid-match",
    label: "Post-Plaid product matching",
    mustContain: ["Match your card", "American Express Gold Card", "Suggested match", "Matched card product"],
  },
  {
    slug: "selection-outcomes",
    label: "Signed-in selection outcomes",
    mustContain: [
      "Selection outcome baseline",
      "Manual card saved",
      "Plaid accounts linked",
      "Card match saved",
      "Connected account removed",
      "plaid-acct_amex_gold",
      "plaid-acct_reserve",
      "wallet",
      "match",
      "idle",
    ],
  },
];

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: Boolean(options.detached),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const killChild = (signal) => {
      try {
        if (options.detached) {
          process.kill(-child.pid, signal);
        } else {
          child.kill(signal);
        }
      } catch {
        // Process already exited.
      }
    };
    let killTimeout = null;
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          killChild("SIGTERM");
          killTimeout = setTimeout(() => {
            killChild("SIGKILL");
          }, 2000);
        }, options.timeoutMs)
      : null;

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      if (killTimeout) clearTimeout(killTimeout);

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const timeoutMessage = timedOut ? " after timeout" : "";
      reject(new Error(`${command} exited ${code}${timeoutMessage}\n${stderr || stdout}`));
    });
  });
}

async function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      await run(candidate, ["--version"], { timeoutMs: 5000 });
      return candidate;
    } catch {
      // Try the next known browser path.
    }
  }

  throw new Error("Could not find Chrome/Chromium. Set CHROME_PATH to a browser executable.");
}

function evidenceUrlForState(slug) {
  const url = new URL("/evidence/onboarding", baseUrl);
  url.searchParams.set("state", slug);
  return url.toString();
}

function stripScripts(dom) {
  return dom.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

function missingFragments(dom, fragments) {
  const searchable = stripScripts(dom);
  return fragments.filter((fragment) => !searchable.includes(fragment));
}

const chrome = await findChrome();
const profileDir = await mkdtemp(path.join(os.tmpdir(), "card-reader-onboarding-smoke-"));
const captures = [];

try {
  if (domOutputDir) {
    await rm(domOutputDir, { recursive: true, force: true });
    await mkdir(domOutputDir, { recursive: true });
  }

  for (const state of states) {
    const url = evidenceUrlForState(state.slug);
    const { stdout } = await run(
      chrome,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${profileDir}`,
        "--window-size=500,980",
        "--virtual-time-budget=2500",
        "--dump-dom",
        url,
      ],
      { timeoutMs, detached: true },
    );

    const missing = missingFragments(stdout, state.mustContain);
    if (domOutputDir) {
      await writeFile(path.join(domOutputDir, `${state.slug}.html`), stdout);
    }
    if (missing.length > 0) {
      throw new Error(`${state.label} is missing expected rendered text: ${missing.join(", ")}`);
    }

    captures.push({ state: state.label, url, checked: state.mustContain.length });
  }
} finally {
  if (!process.env.SMOKE_KEEP_PROFILE) {
    await rm(profileDir, { recursive: true, force: true });
  }
}

console.log(JSON.stringify({ baseUrl, browser: chrome, captures }, null, 2));
