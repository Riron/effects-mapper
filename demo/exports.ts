import { Action } from '@ngrx/store';

export const exportedType = 'EXPORTED';
export class ExportedEvent implements Action {
  readonly type = 'EXPORTED_EVENT';
}
