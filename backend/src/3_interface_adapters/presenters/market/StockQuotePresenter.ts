// src/3_interface_adapters/presenters/market/StockQuotePresenter.ts
import { StockQuote } from '../../../1_entities/market/StockQuote';
import {
  IGetStockQuoteOutputPort,
  StockQuoteSuccessViewModel,
  StockQuoteErrorViewModel,
} from '../../../2_use_cases/market/get_stock_quote/IGetStockQuoteOutputPort';

export class StockQuotePresenter implements IGetStockQuoteOutputPort {
  public presentSuccess(stock: StockQuote): StockQuoteSuccessViewModel {
    return {
      status: 'success',
      data: {
        symbol: stock.symbol,
        companyName: stock.companyName,
        currentPrice: stock.currentPrice,
        high: stock.high,
        low: stock.low,
        volume: stock.volume,
        interval: '1d',
        dailyVariation: stock.getDailyVariation(),
        dailyVariationPercentage: stock.getDailyVariationPercentage(),
        marketTimestamp: stock.marketTimestamp,
      },
    };
  }

  public presentError(error: Error): StockQuoteErrorViewModel {
    return {
      status: 'error',
      message: error.message,
    };
  }
}
