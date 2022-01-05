import { Middleware } from "@triply/ratt";
import { addMwCallSiteToError } from "@triply/ratt/lib/utils";

export function retrieveDatasetBeschrijving(): Middleware {
  // Retrieving cached datasetBeschrijvingen
  return addMwCallSiteToError(async (ctx, next) => {
    const myQuery = await (
      await ctx.app.triplyDb.getAccount()
    ).getQuery("retrieveDatasetBeschrijving");
    for await (const statement of myQuery
      .results({ dataset: ctx.getString("dataset") })
      .statements()) {
      ctx.store.addQuad(
        statement.subject,
        statement.predicate,
        statement.object,
        ctx.asIri("dataset")
      );
    }
    return next();
  });
}
