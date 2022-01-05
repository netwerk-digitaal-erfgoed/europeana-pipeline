import { Middleware, Store, Ratt } from "@triply/ratt";
import { addMwCallSiteToError } from "@triply/ratt/lib/utils";
import { Parser } from "n3";
import * as fs from "fs-extra";
var md5 = require("md5");
import { IQueryResult } from "@comunica/actor-init-sparql/lib/ActorInitSparql-browser";
import { newEngine } from "@triply/actor-init-sparql-rdfjs";
import * as zlib from "zlib";

export const sources = {
  datasetCatalog: Ratt.Source.url(
    "https://triplestore.netwerkdigitaalerfgoed.nl/repositories/registry",
    {
      request: {
        headers: {
          accept: "text/tab-separated-values",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: `query=${encodeURIComponent(
          "select * where {?dataset a http://www.w3.org/ns/dcat#Dataset}"
        )}`,
        method: "POST",
      },
    }
  ),
  dataset: Ratt.Source.url(
    "https://triplestore.netwerkdigitaalerfgoed.nl/repositories/registry",
    {
      request: {
        headers: {
          accept: "application/trig",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: `query=${encodeURIComponent(
          `PREFIX dcat: <http://www.w3.org/ns/dcat#>
            construct {
                ?s ?p ?o
            } WHERE {
                graph ?graafNaam {
                    <\${dataset}> a dcat:Dataset .
                    ?s ?p ?o
                }
            }`
        )}`,
        method: "POST",
      },
    }
  ),
}

export function retrieveDatasetBeschrijving(): Middleware {
  // Retrieving cached datasetBeschrijvingen
  return addMwCallSiteToError(async (ctx, next) => {
    const myQuery = await (
      await ctx.app.triplyDb.getAccount()
    ).getQuery("retrieveDatasetBeschrijving");
    for await (const statement of myQuery
      .results({ dataset: ctx.getString("dataset")})
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

export function retrieveCachedDataset(): Middleware {
  fs.ensureDirSync("./data/cache/datasets");
  const gz = zlib.createGzip();
  return addMwCallSiteToError(async (ctx, next) => {
    const dsUri = ctx.getString("dataset");
    const url = ctx.get("distribution.url");
    if (!fs.existsSync(`./data/cache/datasets/${md5(dsUri)}`)) {
      const response = await fetch(url);
      if (!response.body)
        throw new Error(`Response of ${url} did not return a valid body`);
      const fileStream = fs.createWriteStream(
        `./data/cache/datasets/${md5(dsUri)}`
      );
      await new Promise((resolve, reject) => {
        try {
          (response.body as any).pipe(gz).pipe(fileStream);
          (response.body as any).on("error", reject);
          fileStream.on("finish", resolve);
        } catch (e) {
          reject(e);
        }
      });
    }
    await next();
  });
}

export function executeQuery(fileName: string): Middleware {
  const parser = new Parser();
  return addMwCallSiteToError(async function executeQuery(ctx, next) {
    const fileDir = "./rdf/queries/";
    const queryString = fs.readFileSync(fileDir + fileName, "utf-8");
    let body: string;
    const url = ctx.getString("distribution.url");

    if (!fs.existsSync(`./data/cache/queryResults/${md5(url + queryString)}`)) {
      console.log(`${url}?query=${encodeURIComponent(queryString)}`);
      const response = await fetch(
        `${url}?query=${encodeURIComponent(queryString)}`
      );
      body = await response.text();
    } else {
      body = fs.readFileSync(
        `./data/cache/datasetBeschrijvingen/${md5(url + queryString)}`,
        "utf8"
      );
    }
    ctx.store.addQuads(parser.parse(body));
    return next();
  });
}

export async function retrieveDistributions(
  store: Store
): Promise<{ url: string; format: string }[]> {
  const query = `PREFIX dct: <http://purl.org/dc/terms/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?url ?format WHERE {
  ?ds dcat:distribution ?distribution .
  ?distribution dcat:accessURL ?url ;
                dct:format ?format .
}`;
  let queryResult: IQueryResult;
  queryResult = await newEngine().query(query, { sources: [store] });
  try {
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Parse error")) {
      e.message = "Failed to parse query: " + e.message;
    }
    throw e;
  }
  if (queryResult.type !== "bindings") {
    throw new Error(
      `Expected a select query resulting in bindings, but received: ${queryResult.type}`
    );
  }
  const result = [];
  for (const binding of await queryResult.bindings()) {
    result.push({
      url: binding.get("?url").value,
      format: binding.get("?format").value,
    });
  }
  return result;
}
