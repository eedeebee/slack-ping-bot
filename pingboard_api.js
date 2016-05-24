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

var request = require('request');
var simple_oauth2 = require('simple-oauth2');

module.exports = function(bot, config, bootstrapCallback) {

    var credentials = {
        clientID: config.clientID,
        clientSecret: config.clientSecret,
        site: 'https://app.pingboard.com',
        authorizationPath: '/oauth'
    };
    var oauth2 = simple_oauth2(credentials);

    // create a nice wrapper for the Pingboard API
    var pingboard_api = {
        api_url: 'https://app.pingboard.com/api/v2/',
        oauth_token: null,
        encodeQueryParams: function(queryParams) {
            var ret = [];
            for (var q in queryParams) {
                ret.push(encodeURIComponent(q) + "=" + encodeURIComponent(queryParams[q]));
            }
            return '?' + ret.join("&");
        },
        // this is a simple function used to call the pingboard web API
        callAPI: function(command, options, cb) {
            bot.debug(command, options);
            var request_url = pingboard_api.api_url + command;
            if (options && options.params && Object.keys(options.params).length > 0) {
                request_url = request_url + pingboard_api.encodeQueryParams(options.params);
            }
            bot.log('** API CALL: ' + request_url);
            var access_token;
            if (pingboard_api.oauth_token) {
                access_token = pingboard_api.oauth_token.token.access_token;
            }
            var requestOptions = {
                url: request_url,
                headers: {
                    'Authorization': 'Bearer ' + access_token
                }
            };
            request.get(requestOptions, function(error, response, body) {
                bot.debug('Got response: ', response.statusCode, error, body);
                if (!error && response.statusCode == 200) {
                    var json;
                    try {
                        json = JSON.parse(body);
                    } catch (err) {
                        if (cb) return cb(err || 'Invalid JSON');
                        return;
                    }

                    if (json.ok) {
                        if (cb) cb(null, json);
                    } else {
                        if (cb) cb(json.error, json);
                    }
                } else if (response.statusCode == 401) {
                    bot.log('Got non-authorised (401) response. Token [' +
                        JSON.stringify(pingboard_api.oauth_token) + '] may have expired.' +
                        ' Refreshing token and trying api call again. ', error);
                    getOAuthToken(function() {
                        pingboard_api.callAPI(command, options, cb);
                    });
                } else {
                    if (cb) cb(error || ('Invalid response. Status code: ' + (response.statusCode || "unknown")));
                }
            });
        },
        users: {
            searchUsers: function(options, cb) {
                pingboard_api.callAPI('users', options, cb);
            }
        },
        status: {
            getStatuses: function(options, cb) {
                pingboard_api.callAPI('statuses', options, cb);
            },
            getStatusTypes: function(options, cb) {
                pingboard_api.callAPI('status_types', options, cb);
            }
        }
    };

    // This is an internal function to get the OAuth function for the
    // Pingboard API and save it
    var getOAuthToken = function(cb) {
        var tokenConfig = {};
        oauth2.client.getToken(tokenConfig, function saveToken(error, result) {
            if (error) {
                bot.log('Access Token Error', error.message);
            } else {
                bot.log('Access Token Result: ', JSON.stringify(result));
                pingboard_api.oauth_token = oauth2.accessToken.create(result);
                if (cb) {
                    cb();
                }
            }
        });
    };

    getOAuthToken(bootstrapCallback);

    return pingboard_api;

};
