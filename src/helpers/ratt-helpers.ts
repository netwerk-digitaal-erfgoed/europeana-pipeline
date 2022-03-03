import { Ratt } from "@triply/ratt";
import { IQueryResult } from "@comunica/actor-init-sparql/lib/ActorInitSparql-browser";
import { newEngine } from "@triply/actor-init-sparql-rdfjs";
import { addMwCallSiteToError } from "@triply/ratt/lib/utils";

export function sparqlSelect(key: string, query: string) {
  return addMwCallSiteToError(async function _sparqlSelect(ctx, next) {
    let queryResult: IQueryResult;
    try {
      queryResult = await newEngine().query(query, {
        sources: [ctx.store],
      });
    } catch (e: any) {
      e.message = `While executing SPARQL query: ` + e.message;
      throw e;
    }
    if (queryResult.type !== "bindings") {
      throw new Error(
        `Expected SPARQL target to return bindings, but received: ${queryResult.type}. SPARQL targets should only be SELECT queries.`
      );
    }
    ctx.record[key] = await queryResult.bindings();
    return next();
  });
}

export const prefix = {
  aat: Ratt.prefixer('http://vocab.getty.edu/aat/'),
  adms_assetType: Ratt.prefixer('http://purl.org/adms/assettype/'),
  adms_status: Ratt.prefixer('http://purl.org/adms/status/'),
  bibo: Ratt.prefixer('http://purl.org/ontology/bibo/'),
  bibo_status: Ratt.prefixer('http://purl.org/ontology/bibo/status/'),
  con: Ratt.prefixer('http://www.w3.org/2000/10/swap/pim/contact#'),
  dbo: Ratt.prefixer('http://dbpedia.org/ontology/'),
  dbr: Ratt.prefixer('http://dbpedia.org/resource/'),
  dcm: Ratt.prefixer('http://purl.org/dc/dcmitype/'),
  dct: Ratt.prefixer('http://purl.org/dc/terms/'),
  deo: Ratt.prefixer('http://purl.org/spar/deo/'),
  doco: Ratt.prefixer('http://purl.org/spar/doco/'),
  fabio: Ratt.prefixer('http://purl.org/spar/fabio/'),
  foaf: Ratt.prefixer('http://xmlns.com/foaf/0.1/'),
  format: Ratt.prefixer('http://www.w3.org/ns/formats/'),
  frbr: Ratt.prefixer('http://purl.org/vocab/frbr/core#'),
  geo: Ratt.prefixer('http://www.opengis.net/ont/geosparql#'),
  orb: Ratt.prefixer('http://purl.org/orb/1.0/'),
  org: Ratt.prefixer('http://www.w3.org/ns/org#'),
  owl: Ratt.prefixer('http://www.w3.org/2002/07/owl#'),
  pnv: Ratt.prefixer('https://w3id.org/pnv#'),
  po: Ratt.prefixer('http://www.essepuntato.it/2008/12/pattern#'),
  qb: Ratt.prefixer('http://purl.org/linked-data/cube#'),
  rdf: Ratt.prefixer('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  rdfs: Ratt.prefixer('http://www.w3.org/2000/01/rdf-schema#'),
  sdo: Ratt.prefixer('https://schema.org/'),
  sh: Ratt.prefixer('http://www.w3.org/ns/shacl#'),
  skos: Ratt.prefixer('http://www.w3.org/2004/02/skos/core#'),
  ssd: Ratt.prefixer('http://www.w3.org/ns/sparql-service-description#'),
  swap: Ratt.prefixer('http://www.w3.org/2000/10/swap/pim/doc#'),
  time: Ratt.prefixer('http://www.w3.org/2006/time#'),
  topic: Ratt.prefixer('https://triplydb.com/Triply/topics/id/'),
  vann: Ratt.prefixer('http://purl.org/vocab/vann/'),
  vs: Ratt.prefixer('http://www.w3.org/2003/06/sw-vocab-status/ns#'),
  wgs84: Ratt.prefixer('http://www.w3.org/2003/01/geo/wgs84_pos#'),
  xsd: Ratt.prefixer('http://www.w3.org/2001/XMLSchema#'),
}
