// src/2_use_cases/market/shared_ports/IMarketCommandGateway.ts
import { StockQuote } from '../../../1_entities/market/StockQuote';

export interface IMarketCommandGateway {
  saveQuote(stock: StockQuote): Promise<void>;
}
