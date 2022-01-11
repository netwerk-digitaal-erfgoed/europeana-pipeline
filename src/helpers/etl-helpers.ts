import { Context } from "@triply/ratt";
const md5 = require("md5");
import { Parser } from "n3";
import { ensure_service, ensure_query } from "./triplydb-helpers";
import { rattSPARQL, externalSPARQL } from "./ratt-helpers";
import { addMwCallSiteToError } from "@triply/ratt/lib/utils";
import {
  retrieveInstances,
  retrieveInstancesName,
  eccbooks2edm,
  eccbooks2edmQueryString,
  eccucfix2edm,
  eccucfix2edmQueryString,
  finnabooks2edm,
  finnabooks2edmQueryString,
  ksamsok2edm,
  ksamsok2edmQueryString,
  nmvw2edm,
  nmvw2edmQueryString,
  schema2edm,
  schema2edmQueryString,
} from "./generics";
import mw from "@triply/ratt/lib/middlewares";
import * as path from "path";
import { streamToString } from "@triply/ratt/lib/utils/files";
import { IQueryResult } from "@comunica/actor-init-sparql/lib/ActorInitSparql-browser";
import { newEngine } from "@triply/actor-init-sparql-rdfjs";
import parse from "csv-parse";
import Pumpify from "pumpify";

// Record
const datasetIri = "?datasetIri";
const dataUrl = "?dataUrl";
const dataserviceType = "?type";
const dataFormat = "?dataFormat";
const applicationSPARQLQuery = "application/sparql-query";
const triplyDBService = "default";
const contentLength = "content-length";
const dataService = "?dataService";

export declare type CompressionType = "gz" | undefined;

export function constructQueries(type: "TriplyDB" | "RATT" | "extern") {
  return [
    mw.when((_ctx)=> type!= "TriplyDB",_constructQueries()),
    sparql("$parent." + dataService, eccbooks2edm, type),
    sparql("$parent." + dataService, eccucfix2edm, type),
    sparql("$parent." + dataService, finnabooks2edm, type),
    sparql("$parent." + dataService, ksamsok2edm, type),
    sparql("$parent." + dataService, nmvw2edm, type),
    sparql("$parent." + dataService, schema2edm, type),
  ];
}

export function _constructQueries() {
  return [
    mw.add({
      key: eccbooks2edm,
      value: (ctx: Context) => {
        return eccbooks2edmQueryString.replace(
          /\?id/g,
          ctx.getString("instance")
        );
      },
    }),
    mw.add({
      key: eccucfix2edm,
      value: (ctx: Context) => {
        return eccucfix2edmQueryString.replace(
          /\?id/g,
          ctx.getString("instance")
        );
      },
    }),
    mw.add({
      key: finnabooks2edm,
      value: (ctx: Context) => {
        return finnabooks2edmQueryString.replace(
          /\?id/g,
          ctx.getString("instance")
        );
      },
    }),
    mw.add({
      key: ksamsok2edm,
      value: (ctx: Context) => {
        return ksamsok2edmQueryString.replace(
          /\?id/g,
          ctx.getString("instance")
        );
      },
    }),
    mw.add({
      key: nmvw2edm,
      value: (ctx: Context) => {
        return nmvw2edmQueryString.replace(/\?id/g, ctx.getString("instance"));
      },
    }),
    mw.add({
      key: schema2edm,
      value: (ctx: Context) => {
        return schema2edmQueryString.replace(
          /\?id/g,
          ctx.getString("instance")
        );
      },
    })
  ];
}

export function ensureQueries() {
  return [
    mw.add({
      key: eccbooks2edm,
      value: async (ctx: Context) => {
        const account = await ctx.app.triplyDb.getAccount();
        const dataset = ctx.get(dataService);
        return await ensure_query(account, eccbooks2edm, {
          queryString: eccbooks2edmQueryString,
          dataset: dataset,
          output:"raw",
          variables: [{name:"id",termType:"NamedNode"} ]
        })
      },
    }),
    mw.add({
      key: eccucfix2edm,
      value: async (ctx: Context) => {
        const account = await ctx.app.triplyDb.getAccount();
        const dataset = ctx.get(dataService);
        return await ensure_query(account, eccucfix2edm, {
          queryString: eccucfix2edmQueryString,
          dataset: dataset,
          output:"raw",
          variables: [{name:"id",termType:"NamedNode"} ]
        })
      },
    }),
    mw.add({
      key: finnabooks2edm,
      value: async (ctx: Context) => {
        const account = await ctx.app.triplyDb.getAccount();
        const dataset = ctx.get(dataService);
        return await ensure_query(account, finnabooks2edm, {
          queryString: finnabooks2edmQueryString,
          dataset: dataset,
          output:"raw",
          variables: [{name:"id",termType:"NamedNode"} ]
        })
      },
    }),
    mw.add({
      key: ksamsok2edm,
      value: async (ctx: Context) => {
        const account = await ctx.app.triplyDb.getAccount();
        const dataset = ctx.get(dataService);
        return await ensure_query(account, ksamsok2edm, {
          queryString: ksamsok2edmQueryString,
          dataset: dataset,
          output:"raw",
          variables: [{name:"id",termType:"NamedNode"} ]
        })
      },
    }),
    mw.add({
      key: nmvw2edm,
      value: async (ctx: Context) => {
        const account = await ctx.app.triplyDb.getAccount();
        const dataset = ctx.get(dataService);
        return await ensure_query(account, nmvw2edm, {
          queryString: nmvw2edmQueryString,
          dataset: dataset,
          output:"raw",
          variables: [{name:"id",termType:"NamedNode"} ]
        })
      },
    }),
    mw.add({
      key: schema2edm,
      value: async (ctx: Context) => {
        const account = await ctx.app.triplyDb.getAccount();
        const dataset = ctx.get(dataService);
        return await ensure_query(account, schema2edm, {
          queryString: schema2edmQueryString,
          dataset: dataset,
          output:"raw",
          variables: [{name:"id",termType:"NamedNode"} ]
        })
      },
    })
  ];
}

function sparql(
  endpointKey: string,
  queryKey: string,
  type: "TriplyDB" | "RATT" | "extern"
) {
  if (type === "TriplyDB") {
    return triplyDBSPARQL(queryKey);
  } else if (type === "RATT") {
    return rattSPARQL(endpointKey, queryKey);
  } else if (type === "extern") {
    return externalSPARQL(endpointKey, queryKey);
  }
  throw Error("incorrect service type");
}

export function triplyDBSPARQL(queryKey: string) {
  return addMwCallSiteToError(async function executeQuery(ctx, next) {
    //TD <https://issues.triply.cc/issues/5782>
    const query = ctx.get("$parent."+queryKey);
    ctx.store.addQuads(await query.results({id: ctx.getString("uri")}).statements().toArray());
    return next();
  });
}

export async function endpoint(ctx: Context) {
  // Ophalen endpoint als deze niet al aangemaakt is.
  try {
    if (ctx.getString(dataFormat) === applicationSPARQLQuery) {
      ctx.record[dataserviceType] = "extern";
      return ctx.getString(dataUrl).replace("<", "").replace(">", "");
    }
  } catch (error: any) {
    console.warn(
      error.message,
      `External SPARQL endpoint from dataset ${ctx.record[datasetIri]} is not available or failed to return correct SPARQL`
    );
    return;
  }
  try {
    const head = await fetch(
      `${ctx.getString(dataUrl).replace("<", "").replace(">", "")}`,
      {
        method: "HEAD",
      }
    );
    const size = head.headers.get(contentLength);
    if (size && +size < 20000000) {
      // ToDo: set appropiate limiet.
      const parser = new Parser();
      const datasetStore = ctx.app.getNewStore();
      const response = await fetch(
        `${ctx.getString(dataUrl).replace("<", "").replace(">", "")}`
      );
      if (response.body) {
        const rdfStream: any = response.body;
        let extension = path.extname(
          ctx.getString(dataUrl).replace("<", "").replace(">", "")
        );
        let compression: CompressionType;
        if (extension === ".gz") {
          compression = "gz";
        } else if (
          head.headers.get("Content-Encoding") === "application/gzip"
        ) {
          compression = "gz";
        }
        datasetStore.addQuads(
          parser.parse(await streamToString(rdfStream, compression))
        );
        ctx.record[dataserviceType] = "RATT";
        return datasetStore;
      }
    }
  } catch (error: any) {
    console.warn(
      error.message,
      `RATT SPARQL endpoint from dataset ${ctx.record[datasetIri]} could not be created`
    );
  }
  const account = await ctx.app.triplyDb.getAccount();
  const dataset = await account.ensureDataset(md5(ctx.getString(datasetIri)));
  try {
    // inladen van de data als deze nog niet bestaat.
    // Altijd inladen of alleen als er nog niets staat?
    if ((await dataset.getInfo()).graphCount === 0) {
      await dataset.importFromUrls(
        ctx.getString(dataUrl).replace("<", "").replace(">", "")
      );
    }
    // Aanmaken endpoint als deze nog niet bestaat.
    await ensure_service(dataset, triplyDBService);
    ctx.record[dataserviceType] = "TriplyDB";
    return dataset;
  } catch (error) {
    console.warn(
      `TriplyDB SPARQL endpoint from dataset ${
        ctx.record[datasetIri]
      } could not created, see ${
        (await dataset.getInfo()).displayName
      } for more info`
    );
  }
}

export async function triplyDBBindings(ctx: Context) {
  // Part 4: Store a SPARQL query.
  const account = await ctx.app.triplyDb.getAccount();
  const dataset = ctx.get(dataService);
  //TD <https://issues.triply.cc/issues/5782>
  const query = await ensure_query(account, retrieveInstancesName, {
    queryString: retrieveInstances,
    dataset: dataset,
  });
  return query.results().bindings();
}

export async function rattBindings(ctx: Context) {
  let queryResult: IQueryResult;
  const engine = newEngine();
  try {
    queryResult = await engine.query(retrieveInstances, {
      sources: [ctx.get(dataService)],
    });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Parse error")) {
      e.message = "Failed to parse query: " + e.message;
    }
    throw e;
  }

  if (queryResult.type === "bindings") {
    return queryResult.bindings();
  }
  return null;
}

export async function externBindings(ctx: Context) {
  const response = await fetch(`${ctx.get(dataService)}`, {
    headers: {
      accept: "text/tab-separated-values",
      "content-type": "application/sparql-query",
    },
    body: retrieveInstances,
    method: "POST",
  });
  if (response.body) {
    return new Pumpify.obj(
      response.body as any,
      parse({ columns: true, delimiter: "\t" })
    );
  }
}
