#!/usr/bin/env nodejs

var express = require('express');
var app = express();
var request = require("request");  // To make HTTP requests at the server side

var server = require('http').Server(app);
var io = require('socket.io')(server);

// To temporarily store JSON data from GitHub and also
// the number of connected users
var redis = require("redis"),
    redis_client = redis.createClient();

var path = require('path');

const logger = require('./logger');
const argv = require('minimist')(process.argv.slice(2));
const isDev = process.env.NODE_ENV !== 'production';

// Get the intended port number, use port 80 if not provided
const port = argv.port || process.env.PORT || 80;
server.listen(port, (err) => {
  if(err){
    return logger.error(err.message);
  }
});
if(isDev)
  logger.appStarted(port, 'http://localhost');
else
  logger.appStarted(port);

// server static files
app.use('/static', express.static('app'));

// Load main web page
app.get('/', function (req, res) {
  res.sendFile(path.resolve('app/index.html'));
});


// When a socket connection is created
io.on('connection', function (socket) {


// Function to get events from GitHub API
function fetchDataFromGithub(){
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
      logger.d("GitHib request: " + options.headers.Authorization);
      logger.error("GitHub status code: " + response.statusCode);
    }
  })

  setTimeout(fetchDataFromGithub, 2000);
}

setTimeout(fetchDataFromGithub, 2000);

});
