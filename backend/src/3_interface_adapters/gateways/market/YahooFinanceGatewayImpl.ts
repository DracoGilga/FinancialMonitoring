// src/3_interface_adapters/gateways/market/YahooFinanceGatewayImpl.ts
import YahooFinance from 'yahoo-finance2';
import { IStockMarketQueryGateway } from '../../../2_use_cases/market/shared_ports/IStockMarketQueryGateway';
import { StockQuote } from '../../../1_entities/market/StockQuote';
import { IBatchMarketDataGateway } from '../../../2_use_cases/market/get_batch_market_data/IBatchMarketDataGateway';

interface YahooFinanceQuoteResponse {
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketTime?: Date;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
}

interface YahooChartPoint {
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

interface YahooChartResponse {
  meta?: { longName?: string; shortName?: string };
  quotes: YahooChartPoint[];
}

interface YahooFinanceClient {
  quote(symbol: string): Promise<YahooFinanceQuoteResponse>;
  chart?(
    symbol: string,
    options: { period1: Date; period2?: Date; interval: '1d' | '5m' },
  ): Promise<YahooChartResponse>;
}

export class YahooFinanceGatewayImpl
  implements IStockMarketQueryGateway, IBatchMarketDataGateway
{
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
        quote.regularMarketDayHigh ?? quote.regularMarketPrice,
        quote.regularMarketDayLow ?? quote.regularMarketPrice,
        quote.regularMarketVolume ?? 0,
        '1d',
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : undefined;
      throw new Error(`Yahoo Finance API Error: ${message}`);
    }
  }

  public async getHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<StockQuote[]> {
    return this.getChart(symbol, from, to, '1d');
  }

  public async getIntradayData(symbol: string): Promise<StockQuote[]> {
    const now = new Date();
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return this.getChart(symbol, start, now, '5m');
  }

  private async getChart(
    symbol: string,
    from: Date,
    to: Date,
    interval: '1d' | '5m',
  ): Promise<StockQuote[]> {
    try {
      if (!this.yahooFinance.chart) {
        throw new Error('Yahoo Finance chart API is unavailable');
      }
      const chart = await this.yahooFinance.chart(symbol, {
        period1: from,
        period2: to,
        interval,
      });
      const companyName =
        chart.meta?.longName || chart.meta?.shortName || symbol.toUpperCase();
      const fetchedAt = new Date();

      return chart.quotes
        .filter((point) => point.close !== null)
        .map((point) => {
          const close = point.close as number;
          return new StockQuote(
            symbol.toUpperCase(),
            companyName,
            close,
            point.open ?? close,
            close,
            point.date,
            fetchedAt,
            point.high ?? close,
            point.low ?? close,
            point.volume ?? 0,
            interval,
          );
        });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Yahoo Finance chart API Error: ${message}`);
    }
  }
}
