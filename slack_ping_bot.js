/*
*  Copyright 2016 Colin Goodheart-Smithe
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*      http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

var os = require('os');
var moment = require('moment-timezone');
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var yaml_config = require('node-yaml-config');
var Botkit = require('botkit');
var SlackWebAPI = require('botkit/lib/Slack_web_api.js');
var PingboardAPI = require('./pingboard_api.js');

var cache = {};

var config_file = './config.yml';

if (process.env.config) {
    config_file = process.env.config;
}

var config = yaml_config.load(config_file);

var pingboardConfig = config.pingboardConfig;

var slackBotConfig = config.slackBotConfig;

var slackSlashConfig = config.slackSlashConfig;

var messageDelay = config.messageDelay;

var slack_controller = Botkit.slackbot({
    json_file_store: os.homedir()+ '/.slack_ping_bot/file_store',
    debug: false,
});

var bot = slack_controller.spawn(slackBotConfig).startRTM();
var webAPI = SlackWebAPI(bot.botkit, slackBotConfig);

var statusTypes = {};
var loadStatusTypes = function() {
    pingboardAPI.status.getStatusTypes({}, function(error, json) {
        if (!error) {
            json.status_types.forEach(function(status_type) {
                if (pingboardConfig.excluded_status_types.indexOf(status_type.slug) > -1) {
                    bot.botkit.log('Skipping excluded status_type: ', JSON.stringify(status_type));
                } else {
                    statusTypes[status_type.id] = status_type.name;
                }
            });
        } else {
            bot.botkit.log('Request failed. Could not get pingboard status types', error);
        }
    });
};

var pingboardAPI = PingboardAPI(bot.botkit, pingboardConfig, loadStatusTypes);

var dateFormat = "ddd YYYY-MM-DD HH:mm:ss z (Z)";

// Call to Pingboard and get current status for user
var replyWithPingboardStatus = function(mentioned_user_id, reply_function, reply_context) {
    bot.botkit.log('mentioned_user_id', mentioned_user_id);
    webAPI.users.info({
        user: mentioned_user_id
    }, function(error, userInfo) {
        if (userInfo.ok && !userInfo.user.is_bot) {
            var searchUsersOptions = {
                params: {
                    'first_name': userInfo.user.profile.first_name,
                    'last_name': userInfo.user.profile.last_name
                }
            };
            var logPrintableName = (first_name || 'null') + ' ' + (last_name || 'null') + ' (' + mentioned_user_id + ')';
            pingboardAPI.users.searchUsers(searchUsersOptions, function(error, json) {
                if (!error) {
                    var users = json.users;
                    if (users.length == 1) {
                        var userId = users[0].id;
                        var now = Date.now();
                        getstatusOptions = {
                            params: {
                                'user_id': userId,
                                'starts_at': new Date(now),
                                'ends_at': new Date(now)
                            }
                        };
                        pingboardAPI.status.getStatuses(getstatusOptions, function(error, json) {
                            if (!error) {
                                var statuses = json.statuses;
                                if (statuses.length > 0) {
                                    statuses.forEach(function(status) {
                                        var startDate = Date.parse(status.starts_at);
                                        var endDate = Date.parse(status.ends_at);
                                        bot.botkit.debug(status.message + ' - starts: ' + startDate + ', ends: ' + endDate + ', now: ' + now);
                                        if (now >= startDate && now <= endDate) {
                                            bot.botkit.log(status.message + ' - matched');
                                            webAPI.users.info({
                                                user: reply_context.user
                                            }, function(error, authorInfo) {
                                                if (authorInfo.ok && !authorInfo.user.is_bot) {
                                                    var startDateInTZ = moment.tz(startDate, authorInfo.user.tz).format(dateFormat);
                                                    var endDateInTZ = moment.tz(endDate, authorInfo.user.tz).format(dateFormat);
                                                    reply_function(status, reply_context.user, userInfo.user.id, userInfo.user.real_name, startDateInTZ, endDateInTZ, now, reply_context);
                                                } else if (!userInfo.ok) {
                                                    bot.botkit.log('Error getting author user info: [' + reply_context.user + ']: ', error);
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    reply_function(null, reply_context.user, userInfo.user.id, userInfo.user.real_name, null, null, now, reply_context);
                                }
                            } else {
                                bot.botkit.log('Error getting statuses from pingboard. Options : [' + JSON.stringify(getstatusOptions) + ']: ', error);
                            }
                        });
                    } else {
                        bot.botkit.log('Got ' + users.length + ' results from pingboard user search. Cannot resolve user ' + logPrintableName, error);
                    }
                } else {
                    bot.botkit.log('Request failed. Could not get pingboard status for ' + logPrintableName, error);
                }
            });
        } else if (!userInfo.ok) {
            bot.botkit.log('Error getting mentioned user info: [' + mentioned_user_id + ']: ', error);
        }
    });
};

var getStatusReplyText = function(status, authorUserId, mentionedName, startDate, endDate) {
    var statusType = statusTypes[status.status_type_id];
    if (statusType) {
        var statusMessage = status.message;
        return '<@' + authorUserId + '>: ' + mentionedName + ' is currently ' + statusType + ' - ' + statusMessage +
            ' [' + startDate + ' TO ' + endDate + ']' + ' in pingboard and may not reply.';
    }
    return;
};

var replyWithSlackMessage = function(status, authorUserId, mentionedUserId, mentionedName, startDate, endDate, now, message) {
    if (status) {
        var statusMessage = getStatusReplyText(status, authorUserId, mentionedName, startDate, endDate);
        if (statusMessage) {
            if (!cache[authorUserId]) {
                cache[authorUserId] = {};
            }
            if (!cache[authorUserId][mentionedUserId] || ((now - cache[authorUserId][mentionedUserId]) >= messageDelay)) {
                bot.reply(message, statusMessage);
                cache[authorUserId][mentionedUserId] = now;
            }
        }
    }
};

var replyonResponse = function(status, authorUserId, mentionedUserId, mentionedName, startDate, endDate, now, responseContext) {
    if (status) {
        var statusMessage = getStatusReplyText(status, authorUserId, mentionedName, startDate, endDate);
        if (statusMessage) {
            responseContext.res.send(statusMessage);
        } else {
            responseContext.res.send('<@' + authorUserId + '>: ' + mentionedName + ' has no active status on pingboard, so they should be available');
        }
    }else {
        responseContext.res.send('<@' + authorUserId + '>: ' + mentionedName + ' has no active status on pingboard, so they should be available');
    }
};

var userInfosByNameCache = {};
var userInfosByIdCache = {};

var cacheUsersList = function() {
    bot.botkit.log('Reloading User Info Caches');
    webAPI.users.list({}, function(error, response) {
        if (response.ok) {
            userInfosByName = {};
            userInfosById = {};
            response.members.forEach(function(userInfo) {
                var condensedUserInfo = {
                    id: userInfo.id,
                    name: userInfo.name,
                    first_name: userInfo.profile.first_name,
                    last_name: userInfo.profile.last_name,
                    real_name: userInfo.profile.real_name,
                    tz: userInfo.tz
                };
                userInfosByName[userInfo.name] = condensedUserInfo;
                userInfosById[userInfo.id] = condensedUserInfo;
            });
            userInfosByNameCache = userInfosByName;
            userInfosByIdCache = userInfosById;
            bot.botkit.log('User Info Caches reload complete');
        } else {
            bot.botkit.log('Error getting user list: ', error);
        }
    });
};

cacheUsersList();
setInterval(cacheUsersList, config.userCacheRefreshInterval);

var port = config.slackSlashConfig.port || 3000;

bot.botkit.setupWebserver(port);

bot.botkit.webserver.post('/slash', function(req, res) {
    if (req.body) {
        var token = req.body.token;
        if (token && token == slackSlashConfig.token) {
            var command = req.body.command;
            if (command == slackSlashConfig.command) {
                var user = req.body.user_id;
                var text = req.body.text.replace('@', '');
                var textUserInfo = userInfosByNameCache[text];
                if (textUserInfo) {
                    var replyContext = {
                        'user': user,
                        'res': res
                    };
                    replyWithPingboardStatus(textUserInfo.id, replyonResponse, replyContext);
                } else {
                    res.send('Could not find user: ' + text);
                }
            } else {
                bot.botkit.log('received request with invalid command: ' + command);
            }
        } else {
            bot.botkit.log('received request with invalid token: ' + token);
        }
    } else {
        bot.botkit.log('received request with no body');
    }
});

// Register to listen to all messages in the channel which have an @mention in them
slack_controller.hears([/<@(.+?)>/g], ["direct_message", "direct_mention", "mention", "ambient"], function(bot, message) {
    // reply for each @mention in the message (caching will take care of any duplicates)
    message.match.forEach(function(e) {
        var mentioned_user = e.replace('<@', '').replace('>', '');
        replyWithPingboardStatus(mentioned_user, replyWithSlackMessage, message);
    });

});
