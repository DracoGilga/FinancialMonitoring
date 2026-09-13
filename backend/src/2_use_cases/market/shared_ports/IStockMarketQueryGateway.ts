// src/2_use_cases/market/shared_ports/IStockMarketQueryGateway.ts
import { StockQuote } from '../../../1_entities/market/StockQuote';

export interface IStockMarketQueryGateway {
  getQuote(symbol: string): Promise<StockQuote>;
}
