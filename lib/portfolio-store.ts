import fs from "fs";
import path from "path";
import type { PortfolioItem } from "./portfolio";
import { sanitizePortfolio } from "./portfolio";

const PORTFOLIO_FILE = path.join("/tmp", "borsa_portfolio.json");

function readJson<T>(file: string, fallback: T): T {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8")) as T;
    }
  } catch {
    // ignore corrupt tmp files
  }
  return fallback;
}

function writeJson(file: string, data: unknown) {
  try {
    fs.writeFileSync(file, JSON.stringify(data));
  } catch {
    // non-fatal on serverless
  }
}

export function loadServerPortfolio(): PortfolioItem[] {
  const raw = readJson<unknown>(PORTFOLIO_FILE, []);
  return sanitizePortfolio(Array.isArray(raw) ? raw : []);
}

export function saveServerPortfolio(items: PortfolioItem[]) {
  writeJson(PORTFOLIO_FILE, sanitizePortfolio(items));
}
