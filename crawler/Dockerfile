# Build stage
FROM maven:3.6.0-jdk-11-slim AS build

WORKDIR /app/crawler

COPY crawler/src ./src
COPY crawler/libs ./libs
COPY crawler/pom.xml .
RUN mvn --quiet -e -f ./pom.xml clean assembly:assembly

# Package stage
FROM openjdk:11-jre-slim

WORKDIR /app/crawler

COPY --from=build /app/crawler/target/cc-lod-crawler-DockerApplication .
COPY ./configuratie.tsv .

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y parallel \
    && apt-get clean;
RUN chmod 777 ./rdf2edm.sh
