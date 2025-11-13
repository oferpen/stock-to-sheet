import "dotenv/config";
import { readTickers, writeResults, writeTickers } from "./sheets.js";
import { providerFactory } from "./providers/index.js";

const SHEET_ID = process.env.SHEET_ID!;
const SHEET_TAB = process.env.SHEET_TAB || "Tickers";
const PROVIDER = process.env.PRICE_PROVIDER || "alphaVantage";

function pctChange(price?: number, prevClose?: number) {
  if (!price || !prevClose || prevClose === 0) return undefined;
  return Number((((price - prevClose) / prevClose) * 100).toFixed(2));
}

async function runOnce() {
  const start = Date.now();
  const provider = await providerFactory(PROVIDER);
  const symbols = await readTickers(SHEET_ID, SHEET_TAB);
  const rowsIndex = symbols.map((s, i) => ({ symbol: s, rowIndex: i + 2 }));
  const quotes = await provider.getQuotes(symbols);
  const quoteMap = new Map(quotes.map(q => [q.symbol.toUpperCase(), q]));
  const timestamp = new Date().toISOString();

  const rows = rowsIndex.map(({ symbol, rowIndex }) => {
    const q = quoteMap.get(symbol.toUpperCase());
    if (!q) return { rowIndex, timestamp, error: "no-quote" } as const;
    return { rowIndex, price: q.price, changePct: pctChange(q.price, q.prevClose), timestamp };
  });

  await writeResults(SHEET_ID, SHEET_TAB, rows);
  console.log(`Updated ${rows.length} tickers in ${Date.now() - start}ms`);
}

async function main() {
  const mode = process.argv[2] || "once";
  if (mode === "watch") {
    const min = Number(process.env.UPDATE_INTERVAL_MIN || "5");
    const intervalMs = Math.max(1, min) * 60_000;
    await runOnce();
    setInterval(runOnce, intervalMs);
  } else if (mode === "add-tickers") {
    const tickers = process.argv.slice(3);
    if (tickers.length === 0) {
      console.error("Please provide ticker symbols to add");
      process.exit(1);
    }
    await writeTickers(SHEET_ID, SHEET_TAB, tickers);
  } else {
    await runOnce();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
