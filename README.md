#Taut Freenode Gateway

[Taut.us](http://taut.us) is a web frontend for accessing the [Freenode](http://freenode.net) IRC network. It aims to resolve many of the issues with IRC that are driving communities to private discussion forums such as Slack.  Namely:

- **Approachability**: Getting on IRC requires a degree of domain knowledge; installing a client, configuring the client, knowing what servers to connect to, etc.  Web based clients like irccloud have helped with this a lot, but because they aim to be general purpose IRC clients, they cannot avoid the larger warts. Due to differences between implementations of the IRC protocol, IRC clients must conform to the most common feature set and rely on user knowledge to fill in for network specific functionality.

  The solution to this problem is to create not a general purpose IRC client, but a client targeted at only one network. Then the client can have a reasonable expectation of what features and behaviors to tailor for.  It has the added benefit of eliminating the need for the user to configure any more than their personal information.

  Furthermore, it makes it possible to go directly to any channel on the network with little more than a URL.  Any channel which has opted in to public logging will be previewable by visitors without having to join that channel.  Visit [https://taut.us/c/node.js](https://taut.us/c/node.js) for an example of this behavior.

  Channels are linkable by simple and fairly short urls which can be shared easily. When someone visits the channel url directly they will (assuming the channel has opted in to logging) be able to view the current activity in that channel for the last hour (or 1000 events) and be presented with a simple oauth login if they wish to join the conversation. Currently planning support for Twitter, Facebook, and Github accounts. Accounts must be older than 30 days to be usable (this is an anti abuse mechanism).

- **Discoverability**: Finding topical channels on any IRC network is a chore at best. Most channels are not found through user discovery, but by word of mouth. The results of `/list` is enormous and completely useless. Even if you know the command exists (which most people don't), trying to find anything in the output is a needle and haystack situation.

  Taut will sport an indexed list of channels generated automatically from the usage of people on the site.  Any public channel either in use by a member of the site, or being logged by the site via opt-in, will appear on this list.

- **Searchable Indexing**: All channel activity seen by Taut is actively logged into Taut's historical database. Any user which was on the channel at the time the activity occurred will be able to search and view that history.  Channels which opt-in to public logging may be searched by any member of the site (this will eventually be configurable by the channel mods).

- **User Experience**: The goal is to have a fully configurable presentation for users of the site. By default the output presents with an aesthetically pleasing layout reminiscent of Slack and Hipchat, but the user will have the option of choosing from (and hopefully creating) a variety of UI themes to even make the output look like an old-school ircii output if that's what they like.

  Taut will also feature content embedding for automatic previews of links, limited markdown parsing, join/part aggregation, netsplit suppression, snippet pasting and image uploading.

- **User Safety**: By default all users on the Taut system will connect to Freenode with the +R and +g user modes. This means that Taut users can only be privately contacted by freenode users who are logged in to Freenode user services and have been whitelisted by the Taut user.

## Current state of the app.

At this moment all of the infrastucture is in place for tracking channels joined by members of the application. At present this is strictly one-way data flow, and none of the privacy enforcements are in place. The next steps are to lock down the data flow so that only data coming from the Tauter agents will be publicly visible, and to teach the entire system how to obey channel privacy modes.  The next step after this is to build out the systems to allow for outgoing messages (these tasks are denoted with the `2-way Chat` milestone in GH Issues).

## Application structure

Taut is broken down into a set of five distinct services which manage different portions of the site infrastructure.  These services are named using an air travel metaphor.

- **Tarmac**   
  Tarmac manages the individual IRC connections that the Taut system makes with the Freenode network. An active connection is maintained for every user of the application and receives all communication sent to that user. All messages get pushed onto a message queue for digestion by the Gangway service.  Additionally this process listens to an outgoing message queue in order to relay commands to the IRC network. Tarmac is designed to be shardable as demand increases. When a Tarmac process launches it registers itself with the Tower process and launches new connections as instructed by the Tower.

- **Precheck**   
  In order to comply with Undernet requirements for identifying users, every connection made by the Taut system identifies itself with Freenode using the ident protocol, and Precheck is what acts as the identd.  When a new connection is opened by Tarmac, that connection's port is registered with Precheck before the connection logs in to the network.
  Every user on the Taut system is assigned a randomly generated IRC username which identifies their account to Freenode. This is done to enable banning of abusive users without affecting the Taut system itself.  Precheck will only work if the OS has forwarded port 113 to 10113 and any NAT hardware has been configured for port forwarding. Without those requirements users will not be idented on login.

- **Tower**   
  The control tower for all active messages. Tracks what users are assigned to what Tarmac instances and automatically cleans up if a Tarmac instance crashes. It also dispatches channel events for marking gaps in channel logging when all connections have left a channel.

- **Gangway**   
  All incoming messages get pushed on to a message queue. Gangway is the consumer for that queue, aggregating all channel activity for the elasticsearch logging database and dispatching redis pubsub events for consumption by Concourse.

- **Concourse**   
  The user facing web portion of the Taut application. This contains the express and socket.io server as well as all of the front-end logic for driving the user experience.  The frontend logic is a collection of Backbone View components sourced via RequireJS. The styles are compiled from SCSS, built on top of Bootstrap 4.  All build tasks are managed via a Gulp build pipeline which has been setup with separate Development and Production workflows.

All of these services live in the `/src` directory of the repo and inherit the `shared` dependency which is bundled into their builds.  The `shared` folder contains all IO interfaces and data models for the entire infrastructure, as well as any common library modules used by multiple services.

The src folder contains a number of other utilities as well, such as the deployment tool used on the taut.us servers.

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
src/utils/bin/user.setlogin --userid=FINNERY --email=finnery@chipersoft.com --password=hunter2
src/utils/bin/user.joinchannel --userid=FINNERY '#node.js'
```

The agent will receive a random username in the form of `finnerXX` if no nickname is set. If you wish to define a nickname, add `--nickname=NICKNAME` to the `user.setirc` command.  If you want that user to identify with nickserv on connect, call:

```
src/utils/bin/user.setnickserv finnery@chipersoft.com NICKNAME PASSWORD
```

## Deploying

**Collaborators: Please do not deploy without discussing it first.**

All branches prefixed with `deploy/` on Origin will automatically kick off a CodeShip deployment for the service named on the branch.  CodeShip will checkout the repo, install the dependencies for that service, run tests (if applicable) and then pack the service into a tarball, which gets uploaded to S3 in incremental build numbers.  It then SSH's into the taut.us server and deploys the build.

All services except for Tarmac are automatically restarted on deployment (deployer and utils do not have anything to restart).

## Code Style

`.eslintrc` and `.jscsrc` files exist in the project root to define the expected code style for this project. However, only the Concourse project has a linting task setup to enforce these rules.