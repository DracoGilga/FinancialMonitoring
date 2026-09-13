// src/2_use_cases/market/get_stock_quote/IGetStockQuoteInputPort.ts
import { GetStockQuoteRequest } from './GetStockQuoteRequest';
import { GetStockQuoteResponse } from './GetStockQuoteResponse';

export interface IGetStockQuoteInputPort {
  execute(request: GetStockQuoteRequest): Promise<GetStockQuoteResponse>;
}
