import { PriceProvider } from "./index.js";
import type { Quote } from "./types.js";

export class MockProvider implements PriceProvider {
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    return symbols.map(s => ({
      symbol: s,
      price: Number((100 + Math.random() * 50).toFixed(2)),
      prevClose: Number((100 + Math.random() * 50).toFixed(2))
    }));
  }
}
