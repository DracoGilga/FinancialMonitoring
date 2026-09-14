import { GetBatchMarketDataRequest } from './GetBatchMarketDataRequest';
import { GetBatchMarketDataResponse } from './GetBatchMarketDataResponse';

export interface IGetBatchMarketDataInputPort {
  execute(
    request: GetBatchMarketDataRequest,
  ): Promise<GetBatchMarketDataResponse>;
}
