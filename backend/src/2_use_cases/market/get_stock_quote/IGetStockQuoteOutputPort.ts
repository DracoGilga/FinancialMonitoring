// src/2_use_cases/market/get_stock_quote/IGetStockQuoteOutputPort.ts
import { StockQuote } from '../../../1_entities/market/StockQuote';

export interface StockQuoteSuccessViewModel {
  status: 'success';
  data: {
    symbol: string;
    companyName: string;
    currentPrice: number;
    dailyVariation: number;
    dailyVariationPercentage: number;
    marketTimestamp: Date;
  };
}

export interface StockQuoteErrorViewModel {
  status: 'error';
  message: string;
}

export type StockQuoteResultViewModel =
  StockQuoteSuccessViewModel | StockQuoteErrorViewModel;

export interface IGetStockQuoteOutputPort {
  presentSuccess(stock: StockQuote): StockQuoteSuccessViewModel;
  presentError(error: Error): StockQuoteErrorViewModel;
}
