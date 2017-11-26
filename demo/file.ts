import { Action } from '@ngrx/store';
import { Actions, Effect } from '@ngrx/effects';
import { from } from 'rxjs/observable/from';
import { mergeMap, map, tap } from 'rxjs/operators';
import { Observable } from 'rxjs/Observable';

class FetchEvent implements Action {
  readonly type = 'FETCH_EVENT';
}
class CreateEvent implements Action {
  readonly type = 'CreateEvent';
}
class EditEvent implements Action {
  readonly type = 'EditEvent';
}
class FetchEvents implements Action {
  readonly type = 'FetchEvents';
}

class CustomAction {
  constructor(private type: string) {}
}

export class EventsEffectsService {
  constructor(private actions$: Actions) {}

  @Effect({ dispatch: false })
  eventModification$ = this.actions$
    .ofType<CreateEvent | EditEvent>('CREATE_EVENT', 'EDIT_EVENT')
    .pipe(tap(() => 1));

  @Effect()
  fetchEvents$: Observable<FetchEvent> = this.actions$
    .ofType<FetchEvents>('FETCH_EVENTS')
    .pipe(
      mergeMap((payload: any) =>
        from(payload.map((id: any) => new FetchEvent()))
      )
    );

  @Effect()
  fetchEvent$ = this.actions$
    .ofType<FetchEvent>('FETCH_EVENT')
    .pipe(map((payload: any) => new CreateEvent()));

  @Effect()
  fetchEvent2$ = this.actions$
    .ofType<FetchEvent>('FETCH_EVENT')
    .pipe(map((payload: any) => new EditEvent()));

  @Effect()
  try$ = this.actions$
    .ofType('AA')
    .pipe(map((payload: any) => ({ type: 'TEST' })));

  @Effect()
  test$ = this.actions$
    .ofType('TEST')
    .pipe(map((payload: any) => new CustomAction('LOL')));
}
