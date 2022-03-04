/* TriplyDB.js helpers (2021-11-14)
 *
 */

import { Account, } from '@triply/triplydb/lib/Account'
import { AddQueryDataset } from '@triply/triplydb/lib/commonAccountFunctions'
import Dataset from '@triply/triplydb/lib/Dataset'
import Service from '@triply/triplydb/lib/Service'


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
      const query = await account.getQuery(name)
      await query.delete()
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
    if (!await _service.isUpToDate()) await _service.update()
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
