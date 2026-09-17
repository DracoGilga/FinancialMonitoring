// src/2_use_cases/market/shared_ports/IStockMarketQueryGateway.ts
import { StockQuote } from '../../../1_entities/market/StockQuote';
import { SymbolSearchResult } from '../../../1_entities/market/SymbolSearchResult';

export interface IStockMarketQueryGateway {
  getQuote(symbol: string): Promise<StockQuote>;
  searchSymbols(query: string): Promise<SymbolSearchResult[]>;
}
