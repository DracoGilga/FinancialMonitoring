import { IGetBatchMarketDataInputPort } from './IGetBatchMarketDataInputPort';
import { IGetBatchMarketDataOutputPort } from './IGetBatchMarketDataOutputPort';
import { GetBatchMarketDataRequest } from './GetBatchMarketDataRequest';
import { GetBatchMarketDataResponse } from './GetBatchMarketDataResponse';
import {
  IBatchMarketDataGateway,
  IHistoricalMarketDataRepository,
  IIntradayMarketDataCache,
} from './IBatchMarketDataGateway';
import { MarketDomainException } from '../../../1_entities/market/MarketExceptions';

export class GetBatchMarketDataInteractor implements IGetBatchMarketDataInputPort {
  constructor(
    private readonly marketDataGateway: IBatchMarketDataGateway,
    private readonly historicalRepository: IHistoricalMarketDataRepository,
    private readonly intradayCache: IIntradayMarketDataCache,
    private readonly outputPort: IGetBatchMarketDataOutputPort,
  ) {}

  async execute(
    request: GetBatchMarketDataRequest,
  ): Promise<GetBatchMarketDataResponse> {
    try {
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setUTCFullYear(oneYearAgo.getUTCFullYear() - 1);

      const data = await Promise.all(
        request.symbols.map(async (symbol) => {
          const historical = await this.marketDataGateway.getHistoricalData(
            symbol,
            oneYearAgo,
            now,
          );
          await this.historicalRepository.saveHistorical(historical);

          let intraday = await this.intradayCache.getIntraday(symbol);
          if (!intraday) {
            intraday = await this.marketDataGateway.getIntradayData(symbol);
            await this.intradayCache.saveIntraday(symbol, intraday);
          }

          return { symbol, historical, intraday };
        }),
      );

      return this.outputPort.presentSuccess(data);
    } catch (error: unknown) {
      if (error instanceof MarketDomainException) {
        throw error;
      }
      return this.outputPort.presentError(
        error instanceof Error ? error : new Error('Unknown error'),
      );
    }
  }
}
