// src/3_interface_adapters/gateways/market/YahooFinanceGatewayImpl.ts
import YahooFinance from 'yahoo-finance2';
import { IStockMarketQueryGateway } from '../../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';

interface YahooFinanceQuoteResponse {
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketTime?: Date;
}

interface YahooFinanceClient {
  quote(symbol: string): Promise<YahooFinanceQuoteResponse>;
}

export class YahooFinanceGatewayImpl implements IStockMarketQueryGateway {
  constructor(
    private readonly yahooFinance: YahooFinanceClient = new YahooFinance(),
  ) {}

  public async getQuote(symbol: string): Promise<StockQuote> {
    try {
      const quote = await this.yahooFinance.quote(symbol);
      if (!quote || !quote.regularMarketPrice) {
        throw new Error(
          `Symbol ${symbol} not found or market closed on Yahoo Finance`,
        );
      }

      return new StockQuote(
        symbol.toUpperCase(),
        quote.longName || quote.shortName || symbol.toUpperCase(),
        quote.regularMarketPrice,
        quote.regularMarketOpen ?? quote.regularMarketPrice,
        quote.regularMarketPreviousClose ?? quote.regularMarketPrice,
        quote.regularMarketTime ?? new Date(),
        new Date(),
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      throw new Error(`Yahoo Finance API Error: ${message}`);
    }
  }
}
