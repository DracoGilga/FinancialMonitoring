// src/2_use_cases/market/get_stock_quote/GetStockQuoteInteractor.ts
import { IGetStockQuoteInputPort } from './IGetStockQuoteInputPort';
import { GetStockQuoteRequest } from './GetStockQuoteRequest';
import { GetStockQuoteResponse } from './GetStockQuoteResponse';
import { IGetStockQuoteOutputPort } from './IGetStockQuoteOutputPort';
import { IStockMarketQueryGateway } from '../shared_ports/IStockMarketQueryGateway';
import { IMarketCommandGateway } from '../shared_ports/IMarketCommandGateway';

export class GetStockQuoteInteractor implements IGetStockQuoteInputPort {
  constructor(
    private readonly stockGateway: IStockMarketQueryGateway,
    private readonly marketCommandGateway: IMarketCommandGateway,
    private readonly outputPort: IGetStockQuoteOutputPort,
  ) {}

  public async execute(
    request: GetStockQuoteRequest,
  ): Promise<GetStockQuoteResponse> {
    try {
      const stockQuote = await this.stockGateway.getQuote(request.symbol);
      await this.marketCommandGateway.saveQuote(stockQuote);

      return this.outputPort.presentSuccess(stockQuote);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      return this.outputPort.presentError(err);
    }
  }
}
