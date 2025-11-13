import { PriceProvider } from "./index.js";
import type { Quote } from "./types.js";

export class AlphaVantageProvider implements PriceProvider {
  constructor(private apiKey: string) {}

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const out: Quote[] = [];
    for (const symbol of symbols) {
      const url = new URL("https://www.alphavantage.co/query");
      url.searchParams.set("function", "GLOBAL_QUOTE");
      url.searchParams.set("symbol", symbol);
      url.searchParams.set("apikey", this.apiKey);

      const resp = await fetch(url);
      if (!resp.ok) {
        console.warn(`AlphaVantage error for ${symbol}: ${resp.status}`);
        continue;
      }
      const json = await resp.json();
      const q = json["Global Quote"];
      const price = Number(q?.["05. price"]);
      const prevClose = Number(q?.["08. previous close"]);
      if (!Number.isFinite(price)) continue;
      out.push({ symbol, price, prevClose: Number.isFinite(prevClose) ? prevClose : undefined });
      await new Promise(r => setTimeout(r, 1500));
    }
    return out;
  }
}
