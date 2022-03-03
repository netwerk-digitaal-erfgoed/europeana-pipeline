/* TriplyDB.js helpers (2021-11-14)
 *
 * Published at <https://git.triply.cc/etl/ratt-helpers/-/blob/main/tdbjs-helpers.ts>
 */

import { NamedNode } from 'n3'
import { Account, } from '@triply/triplydb/lib/Account'
import { AddQueryDataset } from '@triply/triplydb/lib/commonAccountFunctions'
import TriplyDB from '@triply/triplydb/lib/App'
import Dataset from '@triply/triplydb/lib/Dataset'
import Service from '@triply/triplydb/lib/Service'



/**
 * Adds a new query to this account.
 *
 * @param _this The account to which the query is added.
 * @param name The Triply Name of the query (characters from [A-Za-z-]).
 * @param args Additional arguments:
 *
 *   Required:
 *     @param args.dataset
 *     @param args.queryString The SPARQL query string that is stored as the first version of this query.
 *
 *   Optional:
 *     @param args.accessLevel Default is `'private'`.
 *     @param args.description Default is ''.
 *     @param args.displayName Default is ''.
 *     @param args.output Default is 'table'.
 *     @param args.preferredService Default is the last updated service.
 *
 * Example use:
 *
 *     import { add_query } from './helpers'
 *
 *     const account = await tdb.getAccount()
 *     await add_query(account, 'my-query', {
 *       queryString: 'select * { ?s ?p ?o. }',
 *       dataset: await account.getDataset('my-dataset'),
 *     })
 */




/**
 * Generates a class diagram in Mermaid.
 *
 * @param app A handle to a RATT pipeline.
 * @param accountName The name of an account in TriplyDB.  The default
 *        value is `how-to-model`.
 * @param queryName The name of a query in TriplyDB.  The default
 *        value is `class-diagram`.
 *
 * Example use:
 *
 *     import { class_diagram } from './helpers'
 *
 *     app.use(
 *       mw.loadRdf(app.Sources.model),
 *       class_diagram(app),
 *     )
 */

export async function class_diagram(
  app: TriplyDB,
  accountName: string = 'how-to-model',
  queryName: string = 'class-diagram'
) {
  const account = await app.getAccount(accountName);
  const query = await account.getQuery(queryName);
  const results = (await query.results().bindings().toArray());
  const widget = results.map(result => result['widget']);
  console.info(widget[0]);
}



/**
 * Ensures that this TriplyDB instance has an organization with the given name.
 * @param  _this A client connection with a TriplyDB instance.
 * @param  name The name of the organization.
 * @return An organization with the given name.
 */

export async function ensure_organization(
  _this: TriplyDB,
  name: string
) {
  try {
    return await _this.getOrganization(name)
  } catch (e) {
    console.error(e)
    const user = await _this.getUser()
    return await user.createOrganization(name)
  }
}

/**
 * Adds an asset, replacing the existing asset if it exists.
 */

 export async function putAsset(
  dataset:Dataset,
  file:string,
  assetName: string,
) {
  try {
    const asset = await dataset.getAsset(assetName)
    await asset.delete()
  } finally {
    return await dataset.uploadAsset(file,assetName)
  }
}

/**
 * Ensures that this account has a query with the given name.
 *
 * @param account The account for which the quert will be ensured.
 * @param name The name of the ensured query.
 * @param args Additional arguments (see `add_query`)
 *
 * Example use:
 *
 *     import { ensure_query } from './helpers'
 *
 *     const account = await tdb.getAccount()
 *     ensure_query(account, 'my-query', {
 *       queryString: 'select * { ?s ?p ?o. }',
 *       dataset: await account.getDataset('my-dataset'),
 *     })
 */

export async function ensure_query(
  account: Account,
  name: string,
  args: AddQueryDataset
) {
  try {
    const query = await account.getQuery(name)
    const queryInfo = await query.getInfo()
    const datasetInfo = await args.dataset.getInfo()
    if (queryInfo.requestConfig?.payload.query != args.queryString || queryInfo.dataset?.id !== datasetInfo.id) {
      console.info("Query is out-of-date. Recreating " + name)
      await remove_query(account, name)
      throw Error("Requested query does not match the query string that was retrieved.") // this will be caught below
    }
  } catch (e) {
    await account.addQuery(name, args)
  }
}



/**
 * Ensures that this dataset has a service with the specified name
 *
 * @param _this The dataset for which the service must be ensured.
 * @param name The Triply Name of the service [A-Za-z0-9-].
 *        The default value is 'default'.
 * @param args
 * @returns The service object.
 *
 * Example use:
 *
 *     import { ensure_service } from './helpers'
 *
 *     const account = await tdb.getAccount()
 *     const dataset = await account.getDataset('my-dataset')
 *     const service = await ensure_service(dataset, 'my-service')
 */

export declare interface EnsureServiceArgs {
  type?: 'elasticsearch'|'sparql'|'sparql-jena'
}
export async function ensure_service(
  _this: Dataset,
  name: string = 'default',
  args: EnsureServiceArgs = {}
) {
  const _type = args.type ? args.type : 'sparql'
  let _service: Service
  try {
    _service = await get_service(_this, name)
  } catch (e) {
    _service = await _this.addService(name, {type:_type})
  }
  return _service
}



/**
 * Returns a service object for the given dataset and with the given name.
 * Emits and exception in case such a service does not exist.
 *
 * @param _this The dataset where the service should be present.
 * @param name
 * @return
 *
 * Example use:
 *
 *     import { get_service } from './helpers'
 *
 *     const account = await tdb.getAccount()
 *     const dataset = await account.getDataset('my-dataset')
 *     const service = await get_service(dataset, 'my-service')
 */

export async function get_service(
  _this: Dataset,
  name: string
) {
   const service = _this.getService(name)
   if (!service)  throw Error(`Could not find a service called ${name}.`)
   return service
}



/**
 * Imports the specified graph names from the specified dataset into this dataset.
 *
 * @param _this The dataset that the imported graphs will be added to.
 * @param from The dataset from which graphs are imported.
 * @param graphs The list of names of the graphs that are imported.
 *        If unspecified all graph names are used.
 *
 * Example use:
 *
 *     import { import_from_dataset } from './helpers'
 *
 *     const account = await tdb.getAccount()
 *     const dataset = await account.getDataset('my-dataset'),
 *     const other = (await tdb.getAccount('other-account')).getDataset('other-dataset')
 *     await import_from_dataset(dataset, other)
 */

export async function import_from_dataset(
  _this: Dataset,
  from: Dataset,
  graphs?: NamedNode[]
) {
  await _this.importFromDataset(from, graphs && {graphNames:graphs})
}

/**
 * @todo What is the contribution of this function?
 */

export async function remove_query(
  _this: Account,
  name: string
) {
  try {
    const query = await _this.getQuery(name)
    await query.delete()
  } catch (e) {
    console.error(e)
  }
}
