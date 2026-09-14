import { StockQuote } from '../../../1_entities/market/StockQuote';

export interface IBatchMarketDataGateway {
  getHistoricalData(
    symbol: string,
    from: Date,
    to: Date,
  ): Promise<StockQuote[]>;
  getIntradayData(symbol: string): Promise<StockQuote[]>;
}

export interface IHistoricalMarketDataRepository {
  saveHistorical(quotes: StockQuote[]): Promise<void>;
}

export interface IIntradayMarketDataCache {
  getIntraday(symbol: string): Promise<StockQuote[] | null>;
  saveIntraday(symbol: string, quotes: StockQuote[]): Promise<void>;
}
