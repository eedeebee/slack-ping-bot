# Slack Pingboard App - A Better Slack App for Pingboard Integration

[![npm](https://img.shields.io/npm/v/slack-ping-bot.svg)](https://www.npmjs.com/package/slack-ping-bot)
[![colings86](https://img.shields.io/colings86/slack-ping-bot.svg)](https://github.com/colings86/slack-ping-bot)
[![npm](https://img.shields.io/npm/l/slack-ping-bot.svg)](https://spdx.org/licenses/Apache-2.0.html)

The Slack Pingboard App is a custom integration app for Slack which has two components:

* A Slack Bot - This listens to all messages in channels it is invited to which have @mentions in them. For these messages it checks the mentioned users in Pingboard and replies to the message author for any users that have an active status in Pingboard with their status.
* A slash command - This allows users to use a slash command in slack to check for a user's active status in Pingboard

The aim of this project is to provide a better Slack integration than the current Pingboard slack integration which just lists all the users with an active status in a specified channel in one message once per day. This is not so useful for teams that are highly distributed or more than a few people since the information is not easy to parse and relies on users finding the message rather than reacting when a user messages someone who is away.

## Prerequites

You should instal node and npm before trying to use this app.

## Installation

Slack Pingboard App is available via NPM.

```
bash
npm install --save slack-ping-app
```

## Setting up for contributing

```bash
git clone git@github.com:colings86/slack-ping-bot
```

After cloning the Git repository, you have to install the node dependencies. Navigate to the root of your cloned repository and use npm to install all necessary dependencies.
```bash
npm install
```

Use the `--production` flag to skip the installation of devDependencies. Useful if you just wish to run the app.
```bash
npm install --production
```


## Getting Started

After you've installed Slack Pingboard App, the first thing you'll need to do is create a config file in `~/.slack-ping-bot/config.yml`. The easiest way to do this is to copy the template config file [`config.yml.template`](https://github.com/colings86/slack-ping-bot/blob/master/config.yml.template). The next steps will cover how to get the client id, client secret and tokens.

1. Create a service account on your Pingboard account.
2. Add the service account's client id and secret to the config file in the `pingboardConfig` section.
3. If there are Pingboard status types that you want to exclude (stop the app replying when a user has these status types) add the `slug` of the status type to the `excluded_status_types` array.
4. In Slack, go to your account page.
5. Go to the `Configure Apps` link on the left menu.
6. Set up a slash command and a bot as per the instructions on [the slack API pages](https://api.slack.com/custom-integrations) (the name icon and handle of the bot and slash commands should be the same, in the future this will be an app and this process will be much easier).
7. Copy the bot's `API token` to the `slackBotConfig.token` section in the `~/.slack-ping-bot/config.yml` file.
8. Copy the slash command's `API token` and `command` to the `slackSlashConfig.token` and `slackSlashConfig.command` sections respectively in the `~/.slack-ping-bot/config.yml` file.
9. Set the `messageDelay` in the `~/.slack-ping-bot/config.yml` file to the value (in milliseconds) to use as the amount of time to supress further messages to the user about the mentioned user's status for the bot.

After setting up the config file you then just need to run the node app using the following command:

```bash
node slack_ping_bot.js
```


## How to use the bot part of the app

Invite the bot to a channel using the `/invite` command and the configured bot user's name, e.g. :

```
/invite @pingboardchecker
```

Once invited the bot will listen for messages in the channel which @mention a user (we'll called this the mentionedUser).

If the user who sent the message (the authorUser) is not also a bot, it will get the mentionedUser's info from the slack web API and extract their first and last name.

The bot will then use the first and last name to look up the user in the Pingboard API. If the user is found it will retrieve the mentionedUser's statuses and look for an active status.

If the mentionedUser has an active status the bot will reply to the author user with the mentionedUser's status information to notify them the user may be away and may not reply.

The status information in the reply include the start and end times of the active status which are converted to the authorUser's local time (using the timezone information in their slack profile).

If the original message contained multiple @mentions, the bot will check and reply for each mentionedUser that has an active Pingboard status.

To stop the bot spamming users with the same information it stores the last time it sent a reply for each authorUser and mentionedUser combination and will not reply again for that combination until a configurable time has passed (set in the `messageDelay` configuration parameter).

## How to use the slash command part of the app

In any channel (public or private), type the slash command followed by an @mention, e.g. :

```
/pingboard @fred
```

If the mentioned user has an active status in Pingboard a reply will be sent back with the user's status information. As with the bot behavior, the start time and end time of the status will be converted to the author user's local time (using the timezone information in their slack profile).

The reply sent to the slash command will be private so even in a public channel only the author user is able to see it.
