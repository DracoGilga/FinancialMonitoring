import { UpdateUserRequest } from './UpdateUserRequest';
import { UpdateUserResultViewModel } from './IUpdateUserOutputPort';

export interface IUpdateUserInputPort {
  execute(request: UpdateUserRequest): Promise<UpdateUserResultViewModel>;
}
