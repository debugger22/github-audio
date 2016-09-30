var mute = false;
var volume = 50;

var eventQueue = [];

var socket = io(document.location.hostname);
socket.on('github', function (data) {
  $('#active-nerds-value').html(data.connected_users);
});

$(function(){

  Howler.volume(volume * .01);

});
