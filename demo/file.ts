import { Action } from '@ngrx/store';
import { Actions, Effect } from '@ngrx/effects';
import { from } from 'rxjs/observable/from';
import { mergeMap, map, tap, catchError } from 'rxjs/operators';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';

class FetchEvent implements Action {
  readonly type = 'FETCH_EVENT';
}
class CreateEvent implements Action {
  readonly type = 'CREATE_EVENT';
}
class EditEvent implements Action {
  readonly type = 'EDIT_EVENT';
}
class FetchEvents implements Action {
  readonly type = 'FETCH_EVENTS';
}

class CustomAction {
  constructor(private type: string) {}
}

export class EventsEffectsService {
  constructor(private actions$: Actions) {}

  /** OBJECTS */

  // Not lettable, map and no catch
  @Effect()
  test0$: Observable<Action> = this.actions$
    .ofType('LOGIN')
    .pipe(map(data => ({ type: 'LOGIN_SUCCESS', payload: data })));

  // Lettable, map
  @Effect()
  test1$ = this.actions$
    .ofType('LOGIN')
    .pipe(
      map(data => ({ type: 'LOGIN_SUCCESS', payload: data })),
      catchError(() => of({ type: 'LOGIN_FAILED' }))
    );

  // Lettable, map + catchError
  @Effect()
  test2$: Observable<Action> = this.actions$
    .ofType('LOGIN')
    .pipe(
      map(data => ({ type: 'LOGIN_SUCCESS', payload: data })),
      catchError(() => of({ type: 'LOGIN_FAILED' }))
    );

  /** VOID */
  @Effect({ dispatch: false })
  test3$ = this.actions$
    .ofType<CreateEvent | EditEvent>('CREATE_EVENT', 'EDIT_EVENT')
    .pipe(tap(() => 1));

  /** CLASSES */
  @Effect()
  test4$: Observable<FetchEvent> = this.actions$
    .ofType<FetchEvents>('FETCH_EVENTS')
    .pipe(
      mergeMap((payload: any) =>
        from(payload.map((id: any) => new FetchEvent()))
      )
    );

  @Effect()
  test5$ = this.actions$
    .ofType<FetchEvent>('FETCH_EVENT')
    .pipe(map((payload: any) => new CreateEvent()));

  @Effect()
  test6$ = this.actions$
    .ofType<FetchEvent>('FETCH_EVENT')
    .pipe(map((payload: any) => new EditEvent()));


  @Effect()
  test7$ = this.actions$
    .ofType('TEST')
    .pipe(map((payload: any) => new CustomAction('LOL')));
}
