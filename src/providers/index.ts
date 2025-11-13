import type { Quote } from "./types.js";
export type { Quote } from "./types.js";

export interface PriceProvider {
  getQuotes(symbols: string[]): Promise<Quote[]>;
}

export async function providerFactory(kind: string): Promise<PriceProvider> {
  if (kind === "alphaVantage") {
    const { AlphaVantageProvider } = await import("./alphaVantage.js");
    return new AlphaVantageProvider(process.env.ALPHA_VANTAGE_KEY!);
  }
  if (kind === "mock") {
    const { MockProvider } = await import("./mock.js");
    return new MockProvider();
  }
  throw new Error(`Unknown PRICE_PROVIDER: ${kind}`);
}
