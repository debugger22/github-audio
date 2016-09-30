#!/usr/bin/env nodejs

var request = require("request");  // To make HTTP requests at the server side
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// To temporarily store JSON data from GitHub and also
// the number of connected users
var redis = require("redis"),
    redis_client = redis.createClient();

// start server at port 8000
server.listen(8000);
var github_data;
var socket;

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', function (socket) {

  function fetch_data_from_github(){

    var options = {
      url: 'https://api.github.com/events',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 5.1.1; Nexus 5 Build/LMY48B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/43.0.2357.65 Mobile Safari/537.36',
        'Authorization': 'token ' + process.env.GITHUB_OAUTH_KEY
      }
    };
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        socket.emit('github', body);
      }else{
        console.log(response.statusCode);
      }
    })

    setTimeout(fetch_data_from_github, 2000);
  }

  setTimeout(fetch_data_from_github, 2000);

});
