#Taut Freenode Client Service

## Setting up your local dev environment.

Taut requires Node.js 4.x and NPM 3. Both of these are present in the vagrant instance if you wish to run the services inside the VM (the repo lives at `/vagrant/src`), but the expected workflow is that you will run the services on your host mac.  The recommended method of installing these on the host is to use [NVM](https://github.com/creationix/nvm).

```
nvm install 4
npm install -g npm@3
```

You may also wish to use npm to install Gulp globally so that you can run the Concourse build tasks directly.

You will need to have the XCode command line tools installs, and the agreement accepted, to be able to build the individual services on a Mac.

## Setting up the vagrant environment (virtualbox required)

Before you can launch the vagrant instance for the first time you must either download or make the Taut base box.  You can download the box from the following url:

> http://taut.us.s3.amazonaws.com/taut-ubuntu1504-amd64-vbox5-r2.box

This is a 1.01GB download from S3.  Once downloaded, place the file inside the `packer` directory in the repo.

If you value your bandwidth over your time, or need to work on the packer configuration, install the [packer](http://packer.io) binaries for Mac and run `packer build ubuntu.json` from inside the `packer` directory.  This will download the Ubuntu 15.04 ISO (640MB) and provision a new base box. This takes about 15-20 minutes.

Now you're ready to run `vagrant up`.  This must be done from the repo root the first time, since the box path is relative to the current working directory.

Vagrant will map 3 ports from the VM to your host mac: 3306 (mysql), 9200 (elasticsearch) and 6379 (redis).  If any of these services are running on your mac, you will need to turn them off to boot the vagrant instance.

## Building each service.

Most of the Taut services depend on the `taut.shared` package, which is in the `src/shared` folder.  From inside the `shared` folder perform the following:

```
npm install
npm link
```

Then from inside each service's directory run:

```
npm link taut.shared
npm install
```

Note, you can skip the linking if you wish and npm will copy the shared folder into the service, but then you will need to run `npm install` any time you make changes inside the shared package.

## Launching the services

To start each service you may perform an `npm start`.  Additionally, Tarmac supports `npm run dev` to launch Tarmac automatically with the `FINNERY` user, bypassing the need to have Tower running.

The Concourse service should be launched either with `gulp watch` or `gulp live` in order to ensure the build steps complete before the service launches.

## Creating the testing agent account

In order to connect to IRC and login to the app you will need to create a user.  Any user marked as `keepalive` will automatically be connected by Tower when a Tarmac instance is available.

From the repo root on your host computer, run the following commands to setup the default agent.  The `FINNERY` userid is important if you want to run Tarmac in dev mode.  Feel free to change the email address, password and default channel. Note: The quotes around the channel name are important, as `#` has significance in the shell.

```
src/utils/bin/user.add --userid=FINNERY
src/utils/bin/user.set --userid=FINNERY --is_agent=1
src/utils/bin/user.setirc --userid=FINNERY --keepalive=1
src/utils/bin/user.setpasswd --userid=FINNERY --email=finnery@chipersoft.com --password=hunter2
src/utils/bin/user.joinchannel --userid=FINNERY '#node.js'
```

The agent will receive a random username in the form of `finnerXX` if no nickname is set. If you wish to define a nickname, add `--nickname=NICKNAME` to the `user.setirc` command.  If you want that user to identify with nickserv on connect, call:

```
src/utils/bin/user.setnickserv finnery@chipersoft.com NICKNAME PASSWORD
```

# Deploying

**Please do not deploy without running it by Jarvis first.**

All branches prefixed with `deploy/` on Origin will automatically kick off a CodeShip deployment for the service named on the branch.  CodeShip will checkout the repo, install the dependencies for that service, run tests (if applicable) and then pack the service into a tarball, which gets uploaded to S3 in incremental build numbers.  It then SSH's into the taut.us server and deploys the build.

All services except for Tarmac are automatically restarted on deployment (deployer and utils do not have anything to restart).

# Pushing code to github

Please refrain from frequently pushing to origin.  Because Taut is a private repo, CodeShip only grants me 50 builds per month, and performs a build on every push regardless of what branch you push to.  Note, if you add the message "[skip ci]" to your commit message or description, Codeship will not build that push.

