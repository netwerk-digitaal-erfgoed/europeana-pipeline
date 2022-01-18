import { prefix } from "./ratt-helpers";
import { Ratt } from '@triply/ratt'
import * as fs from 'fs-extra'
// Prefixes
const defaultGraph = Ratt.prefixer(
  "https://data.netwerkdigitaalerfgoed.nl/edm/"
);
const schema = Ratt.prefixer(
  "http://schema.org/"
);
const dcterms = Ratt.prefixer(
  "http://purl.org/dc/terms/"
);
const ksamsok = Ratt.prefixer(
  "http://kulturarvsdata.se/ksamsok#"
);
const bf = Ratt.prefixer(
  "http://id.loc.gov/ontologies/bibframe/"
);

export const prefixes = {
  defaultGraph: defaultGraph,
  schema: schema,
  dcterms: dcterms,
  ksamsok: ksamsok,
  bf: bf,
  ...prefix,
};


export const retrieveDatasets = "retrieveDatasets";
export const retrieveDatasetsQueryString = fs.readFileSync('./rdf/queries/retrieveDatasets.rq', {encoding: 'utf-8'})

export const retrieveInstances = "retrieveInstances";
export const retrieveInstancesQueryString = fs.readFileSync('./rdf/queries/retrieveInstances.rq', {encoding: 'utf-8'})

export const retrieveDatasetMetadata = 'retrieveDatasetMetadata'
export const retrieveDatasetMetadataQueryString = fs.readFileSync('./rdf/queries/retrieveDatasetMetadata.rq', {encoding: 'utf-8'})

export const eccbooks2edm = 'eccbooks2edm'
export const eccbooks2edmQueryString = fs.readFileSync('./rdf/queries/ecc-books2edm.rq', {encoding: 'utf-8'})

export const eccucfix2edm = 'eccucfix2edm'
export const eccucfix2edmQueryString = fs.readFileSync('./rdf/queries/ecc-ucfix2edm.rq', {encoding: 'utf-8'})

export const finnabooks2edm = 'finnabooks2edm'
export const finnabooks2edmQueryString = fs.readFileSync('./rdf/queries/finna-books2edm.rq', {encoding: 'utf-8'})

export const ksamsok2edm = 'ksamsok2edm'
export const ksamsok2edmQueryString = fs.readFileSync('./rdf/queries/ksamsok2edm.rq', {encoding: 'utf-8'})

export const nmvw2edm = 'nmvw2edm'
export const nmvw2edmQueryString = fs.readFileSync('./rdf/queries/nmvw2edm.rq', {encoding: 'utf-8'})

export const schema2edm = 'schema2edm'
export const schema2edmQueryString = fs.readFileSync('./rdf/queries/schema2edm.rq', {encoding: 'utf-8'})
