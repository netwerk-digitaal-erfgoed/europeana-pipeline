# Europeana pipeline

The Europeana-pipeline is a continuation of the [LOD aggregator](https://github.com/netwerk-digitaal-erfgoed/lod-aggregator) project. The goal is to investigate if a linked data pipeline can be designed that can harvest linked data from different sources and convert the information to the Europeana Data Model (EDM) and make the ingest to the Europeana harvesting platform possible. The goal of this project is to expand the [LOD aggregator](https://github.com/netwerk-digitaal-erfgoed/lod-aggregator) and investigate how the pipeline could work in an automated CI/CD process.

The architecture of the has been designed with modularity in mind as well as the use of as many standardized and already available tooling as possible to reduce the amount of custom build code. The architecture of the pipeline is visible in [figure 1](#figure-1).

<figure id="figure-1">
  <img src="/static/images/architectuur.png" >
  <figcaption>
    Figure 1 ― Schematic representation of the architecture of the pipeline.
  </figcaption>
</figure>

## General workflow

For a generic transformation process the following tasks will be performed(All of these steps are also numbered in [figure 1](#figure-1)):

1. The ETL will retrieve the metadata from the [Dataset Register](https://datasetregister.netwerkdigitaalerfgoed.nl/). The metadata contains the location, the format and possibly the SPARQL query to transform the instances of the dataset. This information is needed to perform the mapping step.
2. The pipeline will then proceed to set up a SPARQL endpoint to query if there is not already a SPARQL endpoint available.
3. The mapping step will then convert the dataset from the input vocabulary to EDM with the added SPARQL query.
4. The EDM data is validated according to the SHACL information model for EDM data.
5. The convert service prepares the data for ingesting into Europeana by transforming the linked data in a format for Europeana to ingest.
6. The final procedure is to upload the local files (linked data + EDM asset) to a location on the web. At the moment the data is uploaded to an TriplyDB instance.

Steps 1-4 and 6 have been written with RATT, a TypeScript library designed for handling large data transformations. Please see the RATT online documentation [here](https://triply.cc/docs/ratt).

## 1. Local installation and building

In order to run of develop the pipeline and publish dataset to an online data catalog the pipeline must first be configured. This is done with the following steps:

1. If you haven't configured your environment for running Typescript at all, you should first install Node.js and Yarn.

2. We are then installing the `node.js` dependencies by running the `yarn` command.

3. Finally the `yarn build` command to transpile the Typescript files in the `src/` directory into JavaScript files. This concludes the Typescript part of the pipeline.

4. Next to TypeScript the pipeline will also make use of a JAVA jar. For active development on the JAVA part of the repository you will need to install [JAVA](https://java.com/en/download/help/download_options.html) and [maven](https://maven.apache.org/install.html).

5. When JAVA and maven have been properly set up, compiling the JAR can be done by moving to the `crawler` directory and executing the command: `mvn --quiet -e -f ./pom.xml clean assembly:assembly`. Which will build the executable JAR in the repository.

## 2. Developing the pipeline locally

To develop and run the pipeline locally the correct environment variables have to be set. 4 environment variables have to be set, whereby the `LOCAL_QUERY` is an optional environment variable.

- `SOURCE_DATASET` :: The IRI that denotes the source dataset in the NDE Dataset Registry.
- `DESTINATION_DATASET` :: The name of the dataset in TriplyDB.  The name must only use alphanumeric characters and hyphen (`-`).
- `LOCAL_QUERY` :: The location where the transformation can be found.  Notice that this is only used when the source dataset does not include a transformation query in its metadata.
- `TRIPLYDB_TOKEN` :: Set the default TriplyDB token; should be aligned with the host TriplyDB instance. The token must have at least read and write access. To create your API Token you can follow the guidelines to [create and configure and API Token](https://triply.cc/docs/api-token).

The `SOURCE_DATASET`,`DESTINATION_DATASET` and `LOCAL_QUERY` can also be set in the `configuration.tsv`. The `configuration.tsv` will contain all NDE Dataset Registry datasets that can be transformed to the Europeana linked data format. (see [Section 4.1](#section-4-1) for expanding the configuration file. Only local development from the command line will make use of the environment variables. The docker containers will always use the `configuration.tsv`.

### 2.1 Running the pipeline from the command line

The pipeline is configured to both run from a docker container as well as running outside the docker container from the command line. Running the pipeline from the commandline instead of the docker containers greatly improves debuggability of the pipeline, and makes it easier to test a single dataset.

To run the pipeline from the command line the environment variables need to be set.

#### 2.1.1 Transpile the code

The first steps of the pipeline are written in Typescript, but are executed in JavaScript. The following command transpiles your Typescript code into the corresponding JavaScript code: `yarn build`
Some developers do not want to repeatedly write the `yarn build` command.  By running the following command, transpilation is performed automatically whenever one or more Typescript files are changed: `yarn dev`

The pipeline step developed in JAVA also needs to be transpiled. This can be done by entering the `crawler` directory from the command line and executing the command: `mvn --quiet -e -f ./pom.xml clean assembly:assembly` This will transpile the JAVA code in a JAR executable.

#### 2.1.2 Setup the environment variables
Set up some generic environment variables with:
```sh
./.envrc
```
This will create a .envrc-private in the root directory. Edit this script to set the variables for your environment. To upload the converted data to a TriplyDB instance or to convert larger dataset (>20Mb) set a TriplyDB apikey through the TRIPLYDB_TOKEN. The .envrc-private script also has a placeholder for setting the variables for NDE Datasetregister (URL and query) and EDM SHACL validation script. They are set by default in the code but can be overidden by the setting the environment variables. 

Each time running the pipeline the .envrc-private script must be sourced by using:

```
source ./.envrc-private
```

The CI/CD setup is stil under development (see below). For single runs the `static/scripts/runall.sh` script can be used, a script with environment variables for each datasource must be provided. See `static/scripts/env-example` for more information.  

#### 2.1.3 Running steps 1 through 4

The following command runs the first part of the pipeline:

```sh
yarn ratt ./lib/main.js
```

This command will retrieve the dataset metadata from the `SOURCE_DATASET` environment variable. It will then look for a viable SPARQL endpoint and construct the EDM mapped linked data from the endpoint. Finally the pipeline validates the linked data and creates the local linked data file ready to be transformed by the JAR executable.  

#### 2.1.4 Running the JAR executable

To run the rdf2edm locally we need to move to the correct library to run the JAR, which will be executed by running the bash script on the second line.

```sh
cd crawler/target/
./cc-lod-crawler-DockerApplication/rdf2edm-local.sh
```

The bash script runs the JAR that transforms the linked data file to the format Europeana can ingest. The  

#### 2.1.5 Running the after step

The following command runs the final part of the pipeline moving back to the main folder, the afterhook for uploading the xml assets and the linked data.

```sh
cd ../../
yarn ratt ./lib/after.js
```

This will upload the linked data to the `DESTINATION_DATASET` on the instance where the `TRIPLYDB_TOKEN` was created. The EDM xml files will be uploaded to the same `DESTINATION_DATASET` as a zipped asset.

#### 2.1.6 Running complete pipeline from the command line

Sometimes you want to run the entire pipeline in a single command. To run the pipeline you can copy paste the following set of commands:

```sh
yarn ratt ./lib/main.js && \
cd crawler/target/ && \
./cc-lod-crawler-DockerApplication/rdf2edm-local.sh && \
cd ../../ && \
yarn ratt ./lib/after.js
```

### 2.2 Running the pipeline from docker containers

Running the pipeline in docker containers reduces the amount of configurability needed and will more closely resemble the pipeline when it is running in the gitlab CI/CD. To run the pipeline we first need to build the docker images. To build the docker images we need to run:

1. Building the docker image for the edm-conversion (steps 1 through 4 and 6)
```sh
docker build -f ./config/docker/Dockerfile -t edm-conversie-etl .
```

2. Building the docker image for the rdf2edm-conversion (step 5)
```sh
docker build -f ./crawler/Dockerfile -t edm-conversie-crawler .
```

3. Let's run the docker container with containing the first 4 steps. We do share volumes between the different containers so note that the volume `-v` is correctly shared between containers.

```sh
docker run --rm \
      -v /scratch/edm-conversie-project-acceptance:/home/triply/data \
      -e TRIPLYDB_TOKEN=${TRIPLYDB_TOKEN} \
      -e LOCAL_QUERY=${LOCAL_QUERY} \
      -e SOURCE_DATASET=${SOURCE_DATASET} \
      -e DESTINATION_DATASET=${DESTINATION_DATASET} \
      -e MODE=acceptance \
      --name edm-conversie-project-acceptance \
      edm-conversie-etl \
      ./config/runEtl.sh main
```

4. We can now run the separate docker image for step 5. Do note that we share volumes again. We need to transfer the linked data file, saving us from uploading and downloading the file.

```sh
docker run --rm \
      -v /scratch/edm-conversie-project-acceptance/rdf:/data \
      -e LOCAL_QUERY=${LOCAL_QUERY} \
      -e SOURCE_DATASET=${SOURCE_DATASET} \
      -e DESTINATION_DATASET=${DESTINATION_DATASET} \
      -e MODE=acceptance \
      --name edm-conversie-project-acceptance \
      edm-conversie-crawler \
      ./rdf2edm.sh
```

5. Let's run the docker container with the last step. This is the same container as the first 4 steps only running the after hook of the container instead of the main etl.
```sh
docker run --rm \
      -v /scratch/edm-conversie-project-acceptance:/home/triply/data \
      -e TRIPLYDB_TOKEN=${TRIPLYDB_TOKEN} \
      -e LOCAL_QUERY=${LOCAL_QUERY} \
      -e SOURCE_DATASET=${SOURCE_DATASET} \
      -e DESTINATION_DATASET=${DESTINATION_DATASET} \
      -e MODE=acceptance \
      --name edm-conversie-project-acceptance \
      edm-conversie-etl \
      ./config/runEtl.sh after
```

## 3. Docker and CI/CD

The `gitlab-ci.yml` contains the necessary instructions for the gitlab CI to run the docker images in the CI/CD pipeline. The `.yml` file contains the build and execution procedures both docker images and for running the images in Acceptance or Production mode.

<h3 id='section-4-1'>4.1 Expanding the transformed dataset list</h3>

To accommodate for transforming multiple datasets in a single go the repository also has a `configuration.tsv` file. The tab delimited file contains the different variables that need to be set per dataset and can be easily expanded.

At the moment the tsv has the following headers:`SOURCE_DATASET`,`DESTINATION_DATASET`,`LOCAL_QUERY` corresponding with the environment variables needed to be set. The CI/CD and the local docker images will use the configuration file if the header variables have not been set. To run the docker images locally with the `configuration.tsv` file. Remove the environment variables (`SOURCE_DATASET`,`DESTINATION_DATASET`,`LOCAL_QUERY`) from the docker commands when running the docker images from the command line. The docker images will automatically use the `configuration.tsv` file.


## 4. Acceptance/Production mode

Every ETL is be able to run in at least two modes:

1. Acceptance mode: published to the user account of the person who runs the ETL or to an organization that is specifically created for publishing acceptance versions.
2. Production mode: published to the official organization and dataset location.

By default, ETLs are run in acceptance mode.  They should be specifically configured to run in production mode.
