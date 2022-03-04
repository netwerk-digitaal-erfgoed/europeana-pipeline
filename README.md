# EDM Conversie Project

- SOURCE_DATASET :: The IRI that denotes the source dataset in the NDE Dataset Registry.
- DESTINATION_DATASET :: The name of the dataset in TriplyDB.  The name must only use alphanumeric characters and hyphen (`-`).
- LOCAL_QUERY :: The location where the transformation can be found.  Notice that this is only used when the source dataset does not include a transformation query in its metadata.

In order to be able to publish linked data to an online data catalog, RATT must first be configured.  This is done with the following steps:

1. If you haven't configured your environment for running RATT at all, you should first install Node.js and Yarn.
On Linux, installation works as follows:

    ```sh
    sudo apt install nodejs yarn # Ubuntu, Debian
    sudo dnf install nodejs yarn # Red Hat, Fedora
    ```


2. [Create and configure and API Token.](https://triply.cc/docs/api-token)

3. Install the dependencies by running the `yarn` command.

Please see the RATT online documentation [here](https://triply.cc/docs/ratt).

## 2. Developing your ETL

Once the ETL has been set up, you can start writing your RATT ETL based on the example file `src/main.ts`.

### 2.1 Transpile

Your RATT ETL is written in TypeScript, but the ETL will be executed in JavaScript.  The following command transpiles your TypeScript code into the corresponding JavaScript code:

```sh
yarn build
```

### 2.1.1 Continuous transpilation

Some developers do not want to repeatedly write the `yarn build` command.  By running the following command, transpilation is performed automatically whenever one or more TypeScript files are changed:

```sh
yarn dev
```

### 2.2 Run

The following command runs your ETL:

```sh
yarn ratt ./lib/main.js
```

## 3. Acceptance/Production mode

Every ETL must be able to run in at least two modes:

1. Acceptance mode: published to the user account of the person who runs the ETL or to an organization that is specifically created for publishing acceptance versions.
2. Production mode: published to the official organization and dataset location.

By default, ETLs should run in acceptance mode.  They should be specifically configured to run in production mode.

### 3.1 Command-line flags

One approach for switching from acceptance to production mode makes use of a command-line flag.

The RATT pipeline includes the following specification for the publication location.  Notice that the organization name is not specified:

```ts
destinations: {
  out: Ratt.Destination.TriplyDb.rdf(datasetName, {overwrite: true})
},
```

With the above configuration, data will be uploaded to the user account that is associated with the current API Token.  Because API Tokens can only be created for users and not for organization, this never uploads to the production organization and always performs an acceptance mode run.

If you want to run the ETL in production mode, use the `--account` flag to explicitly set the organization name.  If, for example, you have to upload your data to the `organizationName` account, you should run the following command:

```
yarn ratt ./lib/main.js --account organizationName
```

This performs a production run of the same pipeline.

### 3.2 Environment variable

Another approach for switching from acceptance to production mode makes use of an environment variable.

Your RATT pipeline contains the following configuration:

```ts
destinations: {
  publish:
    process.env['TARGET'] === 'Production'
    ? Ratt.Destination.TriplyDb.rdf(organizationName, datasetName, {overwrite: true})
    : Ratt.Destination.TriplyDb.rdf(organizationName+'-'+datasetName, {overwrite: true})
},
```

Notice that acceptance runs are published under the user account that is associated with the current API Token.

This approach only works when the combined length of the organization name and the dataset name does not exceed 39 characters.

In order to run in production mode, set the following environment variable:

```sh
TARGET="Production"
```

## 4. Optional features

This section documents features that are only used in some but not all projects.

### 4.1 Hard-code the account

It is possible to specify the TriplyDB account in which data should be published in the ETL script (`main.ts`).

Sometimes it is useful to be able to specify the TriplyDB account without changing the ETL code.  This can be done by specifying the following environment variable.  This can be done in the file that is already used to specify the API Token.

```sh
export TRIPLYDB_ACCOUNT={account}
```
## 5. Setting up the pipeline

For information on how to set up your pipeline, you can visit the [corresponding page](https://git.triply.cc/triply/documentation/-/wikis/Setting-up-a-pipeline-for-an-ETL) on our internal documentation.
