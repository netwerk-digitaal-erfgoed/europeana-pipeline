import { Context } from "@triply/ratt";
const md5 = require("md5");
import { Parser } from "n3";
import { rattSPARQL } from "./ratt-helpers";
import {
  retrieveInstances,
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

// Record
const datasetIri = "?datasetIri";
const dataUrl = "?dataUrl";
const dataserviceType = "?type";
const contentLength = "content-length";
const dataService = "?dataService";

export declare type CompressionType = "gz" | undefined;

export function constructQueries() {
  return [
    ..._constructQueries(),
    rattSPARQL("$parent." + dataService, eccbooks2edm),
    rattSPARQL("$parent." + dataService, eccucfix2edm),
    rattSPARQL("$parent." + dataService, finnabooks2edm),
    rattSPARQL("$parent." + dataService, ksamsok2edm),
    rattSPARQL("$parent." + dataService, nmvw2edm),
    rattSPARQL("$parent." + dataService, schema2edm),
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
    }),
  ];
}

export async function endpoint(ctx: Context) {
  // Ophalen endpoint als deze niet al aangemaakt is.
  try {
    const head = await fetch(
      `${ctx.getString(dataUrl).replace("<", "").replace(">", "")}`,
      {
        method: "HEAD",
      }
    );
    const size = head.headers.get(contentLength);
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
      } else if (head.headers.get("Content-Encoding") === "application/gzip") {
        compression = "gz";
      }
      datasetStore.addQuads(
        parser.parse(await streamToString(rdfStream, compression))
      );
      ctx.record[dataserviceType] = "RATT";
      return datasetStore;
    }
  } catch (error: any) {
    console.warn(
      error.message,
      `RATT SPARQL endpoint from dataset ${ctx.record[datasetIri]} could not be created`
    );
  }
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
