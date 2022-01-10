import { flattenDeep } from "lodash";
import { Middleware, MiddlewareList } from "@triply/ratt";
import { composeMiddlewares, DispatchFn } from "@triply/ratt/lib/Ratt";
import { addMwCallSiteToError } from "@triply/ratt/lib/utils";
import { assertIsObject } from "@triply/ratt/lib/utils/asserts";

export function forEachiterator<R = unknown>(
  key: string,
  ...middlewaresArray: MiddlewareList<R>
): Middleware<R> {
  const middlewares = flattenDeep(middlewaresArray).filter(
    (m) => !!m
  ) as Middleware[];
  let dispatch: DispatchFn;
  return addMwCallSiteToError(async function (ctx, next) {
    if (!dispatch) {
      for (const mw of middlewares) {
        if (mw.callSite) {
          ctx.app["touchedMiddlewares"].set(mw.callSite, false);
        }
      }
      dispatch = composeMiddlewares({ middlewares: middlewares, context: ctx });
    }
    const recordId = ctx.recordId;
    const stream = ctx.get(key);
    const origRecord = { ...ctx.record, ...{ [key]: "finished" } };
    let i = 0;
    for await (const item of stream) {
      assertIsObject(item, "Expected array item to be an object");
      await dispatch({
        store: ctx.store,
        record: {
          ...item,
          recordId: i++,
          $parent: origRecord,
          $root: origRecord.$root || origRecord,
        },
      });
    }
    ctx.recordId = recordId;
    await next(origRecord, ctx.store);
  });
}
