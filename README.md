# Harmony

Services. Together.

Harmony has two fundamental goals in life:
1. **Services** - Increase usage and ease of use of EOSDIS' data, especially focusing on opportunities made possible now that data from multiple DAACs reside in AWS.  Users should be able to work seamlessly across data from different DAACs in ways previously unachievable.
2. **Together** - Transform how we, as a development community, work together to accomplish goal number 1.  Let's reuse the simple, but necessary components (e.g. EDL, UMM, CMR and Metrics integration) and let's work together on the stuff that's hard (and fun) like chaining, scaling and cloud optimizations.

For general project information, visit the [Harmony wiki](https://wiki.earthdata.nasa.gov/display/Harmony). Harmony discussion and collaboration occurs in the EOSDIS #harmony Slack channel.


## Table of Contents

- [Harmony](#harmony)
  - [Table of Contents](#table-of-contents)
  - [Minimum System Requirements](#minimum-system-requirements)
  - [Quick Start](#quick-start)
    - [Updating the Local Harmony Instance](#updating-the-local-harmony-instance)
    - [Reloading the Services Configuration](#reloading-the-services-configuration)
    - [Developing Services for Harmony](#developing-services-for-harmony)
  - [Harmony Development Prerequisites](#harmony-development-prerequisites)
    - [Earthdata Login Application Requirement](#earthdata-login-application-requirement)
    - [Software Requirements](#software-requirements)
  - [Running Harmony (Not From Quick Start)](#running-harmony-not-from-quick-start)
    - [Set up Environment](#set-up-environment)
    - [Set Up Environment Variables](#set-up-environment-variables)
      - [Advanced Configuration](#advanced-configuration)
    - [Run Tests](#run-tests)
      - [Test Fixtures](#test-fixtures)
    - [Set Up A Database](#set-up-a-database)
    - [Set Up and Run Postgres and Localstack](#set-up-and-run-postgres-and-localstack)
      - [Prerequisites](#prerequisites)
      - [Installing and running Postgres and Localstack on Kubernetes](#installing-and-running-postgres-and-localstack-on-kubernetes)
      - [Deleting applications and stopping Kubernetes](#deleting-applications-and-stopping-kubernetes)
      - [(minikube only) Configuring the callback URL for backend services](#minikube-only-configuring-the-callback-url-for-backend-services)
    - [Run Harmony](#run-harmony)
    - [Add A Service](#add-a-service)
    - [Deploy Services](#deploy-services)
    - [Connect A Client](#connect-a-client)
  - [Building and Publishing the Harmony Docker Image](#building-and-publishing-the-harmony-docker-image)
  - [Contributing to Harmony](#contributing-to-harmony)
    - [Submitting a Pull Request](#submitting-a-pull-request)
  - [Additional Resources](#additional-resources)

## Minimum System Requirements

* A running [Docker Desktop](https://www.docker.com/products/developer-tools) or daemon instance - Used to invoke docker-based services
* A running [Kubernetes](https://kubernetes.io/) cluster with the [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) command. [Docker Desktop](https://www.docker.com/products/docker-desktop) for Mac and Windows comes with a
built-in Kubernetes cluster (including `kubectl`) which can be enabled in preferences.

## Quick Start
(Mac OS X / Linux)

If you are interested in using a local Harmony instance to develop services, but not interested in
developing the Harmony code itself, the following steps are enough to start a locally running Harmony instance.
See the [Minimum System Requirement](#minimum-system-requirements) above.

1. Follow the directions for creating an Earth Data Login application and credentials in the [Earthdata Login Application Requirement](#Earthdata-Login-Application-Requirement) section below.

2. Download this repository (or download the zip file from GitHub)
```bash
git clone https://github.com/nasa/harmony.git
```

3. (optional) run the `create-dotenv` script in the `bin` directory and answer the prompts to
   create a `.env` file.
  ```bash
  pushd harmony && ./bin/create-dotenv && popd
  ```
   Edit the `.env` file to add any custom image tags (see the `env-defaults` file).

   This step is only needed if you want to use custom service image tags. You can skip this step
   if you just want to use the default service tags for now. You can make changes to .env later.

4. Run the bootstrap script and answer the prompts (if any)
```bash
cd harmony && ./bin/bootstrap-harmony
```

Linux Only (Handled automatically by Docker Desktop)

5. Expose the kubernetes services to the local host. These commands will block so they must be run in separate terminals.
```bash
kubectl port-forward service/harmony 3000:3000 -n harmony
```

**NOTE** The workflow listener will fail repeatedly (restarts every 30 seconds) when Harmony is run
in Kubernetes on Linux. This is a known bug and is to addressed in Jira ticket HARMONY-849.

Harmony should now be running in your Kubernetes cluster as the `harmony` service in the `harmony` namespace.

**NOTE** It may take a while for all the pods to start if this is the first time you have started
Harmony. You can check on the status by running the following command:

```bash
kubectl get pods -n harmony
```

When all the pods are in the 'Running' state then Harmony is ready to go. If you installed
the example harmony service you can test it with the following (requires a [.netrc](https://www.gnu.org/software/inetutils/manual/html_node/The-_002enetrc-file.html) file):

```bash
curl -Ln -bj "http://localhost:3000/C1233800302-EEDTEST/ogc-api-coverages/1.0.0/collections/all/coverage/rangeset?granuleId=G1233800343-EEDTEST" -o file.tif
```

We recommend using [harmony-py](https://github.com/nasa/harmony-py) and its example notebook when working with Harmony.

### Updating the Local Harmony Instance

You can update Harmony by running the `bin/update-harmony` script. This will pull the latest Harmony Docker images from DockerHub and
restart Harmony.

**NOTE** This will recreate the jobs database, so old links to job statuses will no longer work. Also, since it
pulls the harmony image from DockerHub it will overwrite any local changes you have made to the image. This is also
true for the query-cmr image. This script is intended for service developers not working directly on the harmony
source code.

You can include the `-s` flag to update service images as well, e.g.,

```bash
./bin/update-harmony -s
```

### Reloading the Services Configuration

If you modify the `services.yml` file Harmony will need to be restarted. You can do this with the following command:

```bash
./bin/reload-services-config
```
**NOTE** This will recreate the jobs database, so old links to job statuses will no longer work.

### Developing Services for Harmony
If you are developing a service and wish to test it locally with Harmony then you must
define the environment variables needed to run the service and execute the local deployment script.
You can do this with the following steps:

1. Build the image for your service
2. Add entries into the `env-defaults` file for your service. See the `HARMONY_SERVICE_EXAMPLE`
   entries for examples. Be sure to prefix the entries with the name of your service.
   Set the value for the `INVOCATION_ARGS` environment variable. This should be how you would run
  your service from the command line. For example, if you had a python module named `my-service`
  in the working directory, then you would run the service using
  ```bash
  python -m my-service
  ```
  So your entry for `INVOCATION_ARGS` would be
  ```shell
  MY_SERVICE_INVOCATION_ARGS='python -m my-service'
  ```
3. Add an entry for your service (lowercase) to the `.env` file:
```shell
LOCALLY_DEPLOYED_SERVICES=my-service
```
Note that the name used must be the kebab case version of the environment variable prefix used
in `env-defaults`.
4. Run
```bash
./bin/deploy-services
```
## Harmony Development Prerequisites

For developing Harmony on Windows follow this document as well as the information in [docs/dev_container/README.md](docs/dev_container/README.md).

### Earthdata Login Application Requirement

To use Earthdata Login with a locally running Harmony, you must first set up a new application in the Earthdata Login UAT environment using the Earthdata Login UI.  https://wiki.earthdata.nasa.gov/display/EL/How+To+Register+An+Application.  This is a four step process:

1. Request and receive permission to be an Application Creator
2. Create a local/dev Harmony Application in the EDL web interface
3. Add the necessary Required Application Group
4. Update .env with credentials

You must select "401" as the application type for Harmony to work correctly with command line clients and clients like QGIS.  You will also need to add the "eosdis_enterprise" group to the list of required application groups in order for CMR searches issued by Harmony to be able to use your Earthdata Login tokens.  Update `OAUTH_CLIENT_ID` and `OAUTH_PASSWORD` in .env with the information from your Earthdata Login application. Additional information including other OAUTH values to use when creating the application can be found in the example/dotenv file in this repository.


### Software Requirements

Required:
* A local copy of this repository.  Using `git clone` is strongly recommended
* Node.js version 12.  We strongly recommend installing [NVM](https://github.com/nvm-sh/nvm) to add and manage node versions.
* Mac OSX, Linux, or similar command line tooling.  Harmony is tested to run on OSX >= 10.14 and Amazon Linux 2.  Command-line instructions and bash helper files under [bin/](bin/) are tested on OSX >= 10.14.
* [git](https://git-scm.com) - Used to clone this repository
* A running [Docker Desktop](https://www.docker.com/products/developer-tools) or daemon instance - Used to invoke docker-based services
* [Docker compose](https://docs.docker.com/compose/) version 1.20.0 or greater; preferably the latest version, which is v1.26 or greater.
* The [AWS CLI](https://aws.amazon.com/cli/) - Used to interact with both localstack and real AWS accounts
* [SQLite3 commandline](https://sqlite.org/index.html) - Used to create the local development and test databases. Install using your OS package manager, or [download precompiled binaries from SQLite](https://www.sqlite.org/download.html)
* PostgreSQL (required by the pg-native library) - `brew install postgresql` on OSX
* Earthdata Login application in UAT (Details below in the 'Set up Earthdata Login application for your local Harmony instance' section)
* [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/) - A command-line application for interfacing with a Kubenetes API.
* [envsubst](https://pypi.org/project/envsubst) - Used to substitute environment variable placeholders inside configuration files.


Highly Recommended:
* An Amazon Web Services account - Used for testing Harmony against object stores and running Harmony in AWS
* An editor with syntax awareness of TypeScript.  If you do not have this or any preference, consider [Visual Studio Code](https://code.visualstudio.com)


Optional:
* [awscli-local](https://github.com/localstack/awscli-local) - CLI helpers for interacting with localstack
* [Python](https://www.python.org) version 3.7 - Useful for locally running and testing harmony-docker and other backend services

## Running Harmony (Not From Quick Start)

### Set up Environment
If you have not yet cloned the Harmony repository, run
```
$ git clone https://github.com/nasa/harmony.git
```

Ensure envsubst is installed on system.

Ensure node is available and is the correct version, 12.x.y, where "x" >= 14.

```
$ node --version
v12.22.1
```

Ensure npm is available and is version 7 or later.
```
$ npm --version
7.11.2
```

If either are not the correct versions and you are using NVM, install them and ensure your `PATH` is up-to-date by running:

```
$ nvm install && nvm use && npm install -g npm@7
```

The output should include node 12 and npm 7.
```
Now using node v12.22.1 (npm v7.11.2)
```

Be sure to **verify the version on the final line** to make sure the NVM binary appears first in your `PATH`.

From the harmony project root, install library dependencies:
```
$ npm install
```

Recommended: Add `./node_modules/.bin` to your `PATH`.  This will allow you to run binaries from installed node modules.  If you choose not to do this, you will need to prefix node module calls with `npx`, e.g. `npx mocha` instead of just `mocha`

### Set Up Environment Variables

Harmony uses environment variables for managing much of its configuration. Most of the variables can be defaulted, and harmony provides those defaults suitable for local development in the `env-defaults` file. In order to set up the remaining variables, run the following from the harmony project root:

```
$ bin/create-dotenv
```

The script will create a file named `.env` in the root project directory containing only those parameters that cannot be defaulted. Open the file and update the values for any of the variables that are currently blank. Detailed information for the environment variables can be found in the `env-defaults` file.

Harmony reads both the `env-defaults` and `.env` files at startup to determine the configuration. To override any default values, set the desired value in the `.env` file. There is no need to duplicate parameters in the `.env` file if using the default value.

#### Advanced Configuration

Note: The defaults are suitable for running locally with Harmony running in a container in Kubernetes (see [Quick-ish Start](#Quick-ish-Start)) on Mac OS X. If running on Linux or if you don't want to run the Harmony frontend/backend API in Kubernetes there are a few parameters that will also need to be overridden and are documented as such in the `env-defaults` file.

Specifically, if you want to run the Harmony frontend/backend API in standalone (not in Kubernetes) mode, you will need to add the following to your .env file:
Mac OS X
```
LOCALSTACK_HOST=localhost
BACKEND_HOST=host.docker.internal
CALLBACK_URL_ROOT=http://host.docker.internal:3001
```

Linux
```
LOCALSTACK_HOST=localhost
BACKEND_HOST=localhost
CALLBACK_URL_ROOT=http://localhost:3001
```

### Run Tests

To run the linter, tests, and coverage checks as the CI environment will, run

```
$ npm test
```

Harmony uses [eslint](https://eslint.org) as a linter, which can be invoked as `$ npx eslint` (or `$ eslint` if you have set up your `PATH`).  It uses [mocha](https://mochajs.org) for tests, `$ npx mocha`, and [nyc](https://istanbul.js.org) for code coverage, `$ npx nyc mocha`.

#### Test Fixtures
Rather than repeatedly perform the same queries against the CMR, our test suite
uses [node-replay](https://github.com/assaf/node-replay) to record and play back
HTTP interactions.  All non-localhost interactions are recorded and placed in files
in the [fixtures directory](fixtures/).

By default, the test suite will playback interactions it has already seen and
record any new interactions to new files.  This behavior can be changed by setting
the `REPLAY` environment variable, as described in the
[node-replay README](https://github.com/assaf/node-replay).

To re-record everything, remove the fixtures directory and run the test suite. This should be done to cull the recordings when a code change makes many of them obsolete, when CMR adds response fields that Harmony needs to make use of, and periodically to ensure no impactful CMR changes or regressions.

### Set Up A Database

To setup a sqlite3 database with the correct schema for local execution, run

```
$ bin/create-database development
```

This should be run any time the versioned contents of the `db/db.sql` file change.

This will create a file, `db/development.sqlite3`, which will contain your local data.  You can delete the above file to remove
all existing development data.

In production environments, we use PostgreSQL and use database migrations to modify the schema.  If you have a PostgreSQL
database, you can create and/or migrate your database by setting `NODE_ENV=production` and
`DATABASE_URL=postgresql://your-postgres-connection-url` and running:
```
$ npx knex --cwd db migrate:latest
```

### Set Up and Run Postgres and Localstack

In development Harmony uses Localstack](https://github.com/localstack/localstack) to avoid allocating AWS resources. Postgres is also installed (but not used by default).

#### Prerequisites

* Mac:
  * Install [Docker Desktop] https://www.docker.com/products/docker-desktop. Docker Desktop comes bundled with Kubernetes and `kubectl`.
    If you encounter issues running `kubectl` commands, first make sure you are running the version bunedled with Docker Desktop.
  * Run Kubernetes in Docker Desktop by selecting Preferences -> Kubernetes -> Enable Kubernetes
* Linux / Generic:
  * Install [minikube](https://kubernetes.io/docs/tasks/tools/install-kubectl/), a single-node Kubernetes cluster useful for local development
  * Install [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/), a command line interface to Kubernetes.

#### Installing and running Postgres and Localstack on Kubernetes

```
$ ./bin/start-postgres-localstack
```

This will install Postgres and Localstack and forward their ports to localhost. It will take a few minutes the first time you run it. You will know when it has completed when it prints

```
Localstack has started at http://localhost:4566/
Postgres has started at localhost:5432
```

#### Deleting applications and stopping Kubernetes

To delete the postgres and localstack deployment, run:

```
$ kubectl delete namespaces harmony
```

`minikube` users can stop Kubernetes by running `minikube stop`.  Docker Desktop users will
need to close Docker or disable Kubernetes support in the UI.  Note that the latter uninstalls `kubectl`.

#### (minikube only) Configuring the callback URL for backend services

You can skip this step if you are using the default docker driver for minikube and set CALLBACK_URL_ROOT as described in the example dotenv file. If you are using a different driver such as virtualbox you may need to execute the following command to get the IP address minikube has bridged to localhost:

```bash
minikube ssh grep host.minikube.internal /etc/hosts | cut -f1
```

This should print out an IP address. Use this in your .env file to specify the `CALLBACK_URL_ROOT` value, e.g., `CALLBACK_URL_ROOT=http://192.168.65.2:4001`.

### Run Harmony

To run Harmony locally such that it reloads when files change (recommended during development), run

```
$ npm run start-dev
```

In production, we use `$ npm run start` which does the same but does not add the file watching and reloading behavior.

You should see messages about the two applications listening on two ports, "frontend" and "backend."  The frontend application receives requests from users, while the backend application receives callbacks from services.

### Add A Service

Clone the Harmony service example repository into a peer directory of the main Harmony repo
```
$ cd ..
$ git clone https://github.com/nasa/harmony-service-example.git
```

(minikube only) From the harmony-service-example project root, run
```bash
eval $(minikube docker-env)
```

This will set up the proper environment for building the image so that it may be used in minikube.

Next run the following command to build and locally install the image:

```bash
./bin/build-image
```

This may take some time, but ultimately it will produce a local docker image tagged `harmonyservices/service-example:latest`.  You may choose to use another service appropriate to your collection if you have [adapted it to run in Harmony](docs/adapting-new-services.md).

### Deploy Services

To run service(s) you need to create a k8s deployment for each service. Only services currently listed in `tasks/service-runner/config/*.yaml` can be run. The docker images for each service must be available locally in order for the k8s deployment to succeed:
- first follow the instructions in [Developing Services for Harmony](#developing-services-for-harmony)
- then run `./bin/deploy-services` (deploys to k8s)

### Connect A Client

You should now be able to view the outputs of performing a simple transformation request.  Harmony has its own test collection
set up for sanity checking harmony with the harmony-service-example backend.  This will fetch a granule from that collection converted to GeoTIFF:
[http://localhost:3000/C1233800302-EEDTEST/ogc-api-coverages/1.0.0/collections/all/coverage/rangeset?granuleId=G1233800343-EEDTEST](http://localhost:3000/C1233800302-EEDTEST/ogc-api-coverages/1.0.0/collections/all/coverage/rangeset?granuleId=G1233800343-EEDTEST)

You can also set up a WMS connection in [QGIS](https://qgis.org/en/site/about/index.html), for example, by placing the
`http://localhost:3000/C1233800302-EEDTEST/wms` as the "URL" field input in the "Connection Details"
dialog when adding a new WMS connection.  Thereafter, expanding the connection should provide a list of layers obtained through a
GetCapabilities call to the test server, and double-clicking a layer should add it to a map, making a WMS call to retrieve an appropriate
PNG from the test server.

## Building and Publishing the Harmony Docker Image
The Harmony Docker image can be built with the following command:
```bash
npm run build
```

The image can be deployed to DockerHub using the following commands:
```bash
npm run publish
```
## Contributing to Harmony

We welcome Pull Requests from developers not on the Harmony
team. Please follow the standard "Fork and Pull Request" workflow
shown below.

### Submitting a Pull Request

If you are a developer on another team and would like to submit a Pull
Request to this repo:

1. Create a fork of the harmony repository.
2. When ready, submit a PR from the fork's branch back to the harmony
   master branch. Ideally name the PR with a Jira ticket name (e.g.,
   HARMONY-314).
3. The PR's 'build' tab should not show errors.

## Additional Resources

* [Adapting new services to Harmony](docs/adapting-new-services.md)
* [Harmony message schemas](app/schemas/data-operation)
* [EOSS protocol OpenAPI Specification](app/schemas/eoss)
* [Harmony NetCDF to Zarr service repository](https://github.com/nasa/harmony-netcdf-to-zarr)
* [Harmony GDAL-based example service repository](https://github.com/nasa/harmony-service-example)
* [Linux Container-based development with Harmony](docs/dev_container/README.md) (n.b. Windows users)
