import {
  loadPortfolioFromDb,
  savePortfolioToDb,
} from "@/lib/db/portfolio-db";

export async function loadServerPortfolio() {
  return loadPortfolioFromDb();
}

export async function saveServerPortfolio(
  items: Parameters<typeof savePortfolioToDb>[0]
) {
  await savePortfolioToDb(items);
}
