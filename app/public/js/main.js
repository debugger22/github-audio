
var socket = io(document.location.hostname);
socket.on('github', function (data) {
  $("#content").html(data);
});
