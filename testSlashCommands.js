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

var formData = {
    "token":"<ADD TOKEN HERE>",
    "team_id":"T0001",
    "team_domain":"example",
    "channel_id":"C2147483705",
    "channel_name":"test",
    "user_id":"U176N0NUW",
    "user_name":"Steve",
    "command":"/pingboard",
    "text":"@test_user",
    "response_url":"https://hooks.slack.com/commands/1234/5678"
};

request.post({
  headers: {'content-type' : 'application/x-www-form-urlencoded'},
  url:     'http://localhost:3000/slash',
  form: formData
}, function(error, response, body){
  console.log('status code: ', (response ? response.statusCode : 'null'), ', error: ', error, ', body: ', body);
});
