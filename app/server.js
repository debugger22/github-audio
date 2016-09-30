var request = require("request");
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(8000);
var github_data;
var socket;

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});


io.on('connection', function (socket) {

  function fetch_data_from_github(){
    request({
      uri: "https://api.github.com/events",
      method: "GET",
      timeout: 10,
      followRedirect: false,
      maxRedirects: 0
    }, function(error, response, body) {
      if(socket != null){
        socket.emit('github', response);
      }else{
        console.log("Socket is null");
      }
    });

    setTimeout(fetch_data_from_github, 2000);
  }

  setTimeout(fetch_data_from_github, 2000);

});
