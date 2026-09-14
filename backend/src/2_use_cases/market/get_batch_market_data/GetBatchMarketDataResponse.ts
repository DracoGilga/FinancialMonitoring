import { StockQuote } from '../../../1_entities/market/StockQuote';

export type BatchMarketData = {
  symbol: string;
  historical: StockQuote[];
  intraday: StockQuote[];
};

export type GetBatchMarketDataResponse =
  | { status: 'success'; data: BatchMarketData[] }
  | { status: 'error'; message: string };
