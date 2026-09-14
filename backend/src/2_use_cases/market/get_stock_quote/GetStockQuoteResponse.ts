// src/2_use_cases/market/get_stock_quote/GetStockQuoteResponse.ts

export class GetStockQuoteResponse {
  constructor(
    public readonly status: 'success' | 'error',
    public readonly data?: {
      symbol: string;
      companyName: string;
      currentPrice: number;
      high: number;
      low: number;
      volume: number;
      interval: '1d';
      dailyVariation: number;
      dailyVariationPercentage: number;
      marketTimestamp: Date;
    },
    public readonly message?: string,
  ) {}
}
