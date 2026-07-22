#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const states = [
  { slug: "manual-card", label: "Signed-in manual card entry" },
  { slug: "plaid-match", label: "Post-Plaid product matching" },
  { slug: "selection-outcomes", label: "Signed-in selection outcomes" },
  { slug: "auth-entry", label: "Profile auth entry" },
  { slug: "email-verify", label: "Email verification" },
  { slug: "profile-setup", label: "Profile setup" },
];

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
const date = process.env.EVIDENCE_DATE ?? new Date().toISOString().slice(0, 10);
const outputDir = process.env.EVIDENCE_DIR ?? path.join("artifacts", `onboarding-ui-${date}`);
const viewport = process.env.EVIDENCE_VIEWPORT ?? "500,980";
const waitMs = Number(process.env.EVIDENCE_WAIT_MS ?? 2500);

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: Boolean(options.detached),
      stdio: options.ignoreOutput ? "ignore" : ["ignore", "pipe", "pipe"],
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

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      if (killTimeout) clearTimeout(killTimeout);

      if (timedOut && options.acceptExistingFile && existsSync(options.acceptExistingFile)) {
        resolve({ stdout, stderr });
        return;
      }

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
      await run(candidate, ["--version"]);
      return candidate;
    } catch {
      // Try the next known browser path.
    }
  }

  throw new Error("Could not find Chrome/Chromium. Set CHROME_PATH to a browser executable.");
}

async function removeProfileDirs() {
  let entries = [];
  try {
    entries = await readdir(outputDir, { withFileTypes: true });
  } catch {
    return;
  }

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("profile"))
      .map((entry) => rm(path.join(outputDir, entry.name), { recursive: true, force: true })),
  );
}

function buildEvidenceUrl(state) {
  const url = new URL("/evidence/onboarding", baseUrl);
  url.searchParams.set("state", state.slug);
  return url.toString();
}

await mkdir(outputDir, { recursive: true });
await removeProfileDirs();
const chrome = await findChrome();
const captures = [];

for (const state of states) {
  const screenshotPath = path.join(outputDir, `${state.slug}.png`);
  const profilePath = path.join(outputDir, `profile-${state.slug}`);
  const url = buildEvidenceUrl(state);

  await rm(profilePath, { recursive: true, force: true });

  await run(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--force-device-scale-factor=1",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profilePath}`,
      `--window-size=${viewport}`,
      `--virtual-time-budget=${waitMs}`,
      `--screenshot=${screenshotPath}`,
      url,
    ],
    {
      timeoutMs: waitMs + 15000,
      acceptExistingFile: screenshotPath,
      detached: true,
      ignoreOutput: true,
    },
  );

  await rm(profilePath, { recursive: true, force: true });

  captures.push({ state: state.label, url, screenshot: screenshotPath });
}

await removeProfileDirs();

console.log(JSON.stringify({ baseUrl, outputDir, viewport, captures }, null, 2));
