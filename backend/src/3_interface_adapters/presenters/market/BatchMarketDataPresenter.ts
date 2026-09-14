import { IGetBatchMarketDataOutputPort } from '../../../2_use_cases/market/get_batch_market_data/IGetBatchMarketDataOutputPort';
import {
  BatchMarketData,
  GetBatchMarketDataResponse,
} from '../../../2_use_cases/market/get_batch_market_data/GetBatchMarketDataResponse';

export class BatchMarketDataPresenter implements IGetBatchMarketDataOutputPort {
  presentSuccess(data: BatchMarketData[]): GetBatchMarketDataResponse {
    return { status: 'success', data };
  }

  presentError(error: Error): GetBatchMarketDataResponse {
    return { status: 'error', message: error.message };
  }
}
