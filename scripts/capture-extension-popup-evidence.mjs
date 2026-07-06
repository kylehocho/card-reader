#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const merchants = [
  { slug: "whole-foods", label: "Whole Foods", host: "wholefoodsmarket.com", categoryHint: "groceries" },
  { slug: "patagonia", label: "Patagonia", host: "patagonia.com", categoryHint: "shopping" },
  { slug: "delta", label: "Delta Air Lines", host: "delta.com", categoryHint: "flights" },
  { slug: "amazon", label: "Amazon", host: "amazon.com", categoryHint: "shopping" },
  { slug: "chipotle", label: "Chipotle", host: "chipotle.com", categoryHint: "dining" },
];

const demoCardIds = [
  "chase-sapphire-reserve",
  "chase-sapphire-preferred",
  "amex-platinum",
  "amex-gold",
  "capital-one-venture-x",
  "chase-freedom-unlimited",
  "chase-freedom-flex",
  "citi-strata-premier",
  "bilt-mastercard",
  "discover-it-cash-back",
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

const apiBaseUrl = (process.env.APP_BASE_URL ?? "https://card-reader-xi.vercel.app").replace(/\/$/, "");
const date = process.env.EVIDENCE_DATE ?? new Date().toISOString().slice(0, 10);
const outputDir = process.env.EVIDENCE_DIR ?? path.join("artifacts", `extension-popup-${date}`);
const extensionDir = path.resolve(process.env.EXTENSION_DIR ?? "extension");
const viewport = process.env.EVIDENCE_VIEWPORT ?? "430,620";
const waitMs = Number(process.env.EVIDENCE_WAIT_MS ?? 2500);
const [viewportWidth] = viewport.split(",").map((part) => Number(part.trim()));

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

async function fetchRecommendation(merchant) {
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/recommend-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: merchant.label,
          host: merchant.host,
          categoryHint: merchant.categoryHint,
          cardProductIds: demoCardIds,
        }),
      });

      if (!response.ok) {
        throw new Error(`${merchant.label} recommendation failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }

  throw lastError;
}

function popupHarnessHtml(context, recommendation) {
  const stylesUrl = pathToFileURL(path.join(extensionDir, "styles.css")).toString();
  const popupScriptUrl = pathToFileURL(path.join(extensionDir, "popup.js")).toString();
  const seed = JSON.stringify({
    currentContext: context,
    currentRecommendation: recommendation,
    currentError: null,
    apiBaseUrl,
    authToken: "",
    authUserEmail: "",
    authExpiresAt: null,
  });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Card Reader Popup Evidence</title>
    <link rel="stylesheet" href="${stylesUrl}" />
    <style>
      html,
      body {
        width: ${Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 430}px;
        min-width: 0;
        overflow-x: hidden;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="eyebrow">Card Reader</p>
        <h1 id="merchant">Current merchant</h1>
      </header>

      <section id="state" class="panel">
        <p class="muted">Checking this page...</p>
      </section>

      <section id="settings" class="settings">
        <label for="apiBaseUrl">API</label>
        <input id="apiBaseUrl" type="url" placeholder="https://card-reader-xi.vercel.app" />
        <div class="settings-row">
          <span id="authStatus" class="auth-status">Demo catalog</span>
          <div class="popup-actions">
            <button id="refreshRecommendation" class="secondary" type="button">Refresh</button>
            <button id="openOptions" type="button">Settings</button>
          </div>
        </div>
      </section>
    </main>
    <script>
      const seed = ${seed};
      const pick = (source, keys) => {
        const result = {};
        for (const key of Array.isArray(keys) ? keys : [keys]) result[key] = source[key];
        return result;
      };
      window.chrome = {
        runtime: {
          sendMessage: async () => ({ ok: true, context: seed.currentContext, recommendation: seed.currentRecommendation }),
          openOptionsPage: () => {}
        },
        storage: {
          session: { get: async (keys) => pick(seed, keys) },
          sync: {
            get: async (keys) => pick(seed, keys),
            set: async (values) => Object.assign(seed, values)
          },
          local: {
            get: async (keys) => pick(seed, keys),
            remove: async (key) => { delete seed[key]; }
          }
        }
      };
    </script>
    <script src="${popupScriptUrl}"></script>
  </body>
</html>`;
}

await mkdir(outputDir, { recursive: true });
await removeProfileDirs();
const chrome = await findChrome();
if (!existsSync(extensionDir)) {
  throw new Error(`Extension directory does not exist: ${extensionDir}`);
}

const captures = [];

for (const merchant of merchants) {
  const context = {
    merchant: merchant.label,
    host: merchant.host,
    categoryHint: merchant.categoryHint,
    title: merchant.label,
  };
  const recommendation = await fetchRecommendation(merchant);
  const harnessPath = path.join(outputDir, `${merchant.slug}.html`);
  const screenshotPath = path.join(outputDir, `${merchant.slug}.png`);
  const profilePath = path.join(outputDir, `profile-${merchant.slug}`);

  await rm(profilePath, { recursive: true, force: true });
  await writeFile(harnessPath, popupHarnessHtml(context, recommendation));

  await run(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--allow-file-access-from-files",
      `--user-data-dir=${profilePath}`,
      `--window-size=${viewport}`,
      `--virtual-time-budget=${waitMs}`,
      `--screenshot=${screenshotPath}`,
      pathToFileURL(harnessPath).toString(),
    ],
    {
      timeoutMs: waitMs + 15000,
      acceptExistingFile: screenshotPath,
      detached: true,
      ignoreOutput: true,
    },
  );

  await rm(profilePath, { recursive: true, force: true });

  captures.push({
    merchant: merchant.label,
    context,
    recommendation: {
      merchant: recommendation.merchant,
      category: recommendation.category,
      bestCard: recommendation.bestCard?.name,
      multiplier: recommendation.bestCard?.multiplier,
      runnerUp: recommendation.runnerUp?.name ?? null,
      reason: recommendation.reason,
    },
    screenshot: screenshotPath,
    harness: harnessPath,
  });
}

await removeProfileDirs();

const summary = {
  mode: "popup-render-contract",
  apiBaseUrl,
  extensionDir,
  outputDir,
  viewport,
  note: "This captures the extension popup HTML/CSS/JS with seeded production recommendation responses. It verifies popup rendering, not Chrome's installed-extension service worker.",
  captures,
};

await writeFile(path.join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
