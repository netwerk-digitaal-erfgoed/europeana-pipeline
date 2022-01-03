FROM triply/node:20210723-1 as base

MAINTAINER info@triply.cc

ENV ETL_USER="triply" \
    ETL_HOME="/home/triply" \
    ETL_DOCKER_CACHE_DIR="/etc/docker-triply" \
    NODE_ENV=production



ENV ETL_NODE_DIR="${ETL_HOME}/node" \
    ETL_DOCKER_BUILD_SCRIPTS="${ETL_DOCKER_CACHE_DIR}/build"

ENV ETL_DATA_DIR="${ETL_HOME}/data"



COPY ./config/docker/assets/build/installWithSudo.sh /installWithSudo.sh
RUN chmod +x installWithSudo.sh && /installWithSudo.sh


from base as npmInstall
ARG NPM_TOKEN=''
COPY --chown=triply:triply ./package.json ./yarn.lock ${ETL_NODE_DIR}/
COPY --chown=triply:triply ./config/docker/assets/build/installNpmDependencies.sh ${ETL_DOCKER_BUILD_SCRIPTS}/installNpmDependencies.sh
RUN sudo -HEu ${ETL_USER} bash ${ETL_DOCKER_BUILD_SCRIPTS}/installNpmDependencies.sh



from base as final
COPY --chown=triply:triply . ${ETL_NODE_DIR}
COPY --from=npmInstall --chown=triply:triply ${ETL_NODE_DIR}/node_modules/ ${ETL_NODE_DIR}/node_modules
COPY --chown=triply:triply ./config/docker/assets/build/buildPackage.sh ${ETL_DOCKER_BUILD_SCRIPTS}/buildPackage.sh
RUN sudo -HEu ${ETL_USER} bash ${ETL_DOCKER_BUILD_SCRIPTS}/buildPackage.sh

COPY ./config/docker/entrypoint.sh  /sbin/entrypoint.sh
RUN chmod 755 /sbin/entrypoint.sh
ENTRYPOINT ["/sbin/entrypoint.sh"]
CMD ["app:run"]


WORKDIR ${ETL_NODE_DIR}

#There args all the way at the end, so they dont invalidate the cache
ARG BUILD_DATE
ARG COMMIT_SHA=''
ARG BUILD_REF=''


ENV BUILD_DATE=${BUILD_DATE} \
    COMMIT_SHA=${COMMIT_SHA} \
    BUILD_REF=${BUILD_REF}
