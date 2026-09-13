// src/1_entities/market/StockQuote.ts
export class StockQuote {
  constructor(
    public readonly symbol: string,
    public readonly companyName: string,
    public readonly currentPrice: number,
    public readonly openPrice: number,
    public readonly closePrice: number,
    public readonly marketTimestamp: Date,
    public readonly fetchedAt: Date,
  ) {}

  public getDailyVariation(): number {
    return this.currentPrice - this.openPrice;
  }

  public getDailyVariationPercentage(): number {
    if (this.openPrice === 0) {
      return 0;
    }
    return Number(
      ((this.currentPrice - this.openPrice) / this.openPrice).toFixed(4),
    );
  }

  public isMarketUp(): boolean {
    return this.currentPrice >= this.openPrice;
  }

  public isValidSymbol(): boolean {
    return /^[A-Z]{1,5}$/.test(this.symbol);
  }
}
