var mute = false;
var volume = 50;

var eventQueue = [];

var socket = io(document.location.hostname);
socket.on('github', function (data) {
  $('#active-nerds-value').html(data.connected_users);
  data.data.forEach(function(event){
    if(!isEventInQueue(event)){
      eventQueue.push(event);
    }
  });
  console.log("Current queue size: " + eventQueue.length);
});

$(function(){

  Howler.volume(volume * .01);

});


/**
* This function checks whether an event is already in the queue
*/
function isEventInQueue(event){
  for(var i=0; i<eventQueue.length; i++){
    if(eventQueue[i].id == event.id)
      return true;
  }
  return false;
}

var scale_factor = 5,
    note_overlap = 15,
    note_timeout = 300,
    current_notes = 0,
    max_life = 60000;

var svg_background_color = '#ffffff',
    svg_text_color = '#000',
    newuser_box_color = 'rgb(41, 128, 185)',
    bot_color = 'rgb(155, 89, 182)',
    anon_color = 'rgb(46, 204, 113)',
    edit_color = '#fff',
    total_sounds = 51,
    total_edits = 0;

    var celesta = [],
        clav = [],
        swells = [],
        all_loaded = false;


$(function(){
  element = document.documentElement;
  drawingArea = document.getElementsByTagName('#area')[0];
  var width = window.innerWidth || element.clientWidth || drawingArea.clientWidth;
  var height = (window.innerHeight  - $('header').height())|| (element.clientHeight - $('header').height()) || (drawingArea.clientHeight - $('header').height());
  $('svg').css('background-color', svg_background_color);
  $('svg text').css('color', svg_text_color);

  var svg = d3.select("#area").append("svg");
  svg.attr({width: width, height: height});
  svg.style('background-color', svg_background_color);

  // For window resizes
  var update_window = function() {
      width = window.innerWidth || element.clientWidth || drawingArea.clientWidth;
      height = (window.innerHeight  - $('header').height())|| (element.clientHeight - $('header').height()) || (drawingArea.clientHeight - $('header').height());
      svg.attr("width", width).attr("height", height);
  }
  window.onresize = update_window;
  update_window();

  var loaded_sounds = 0;
  var sound_load = function(r) {
      loaded_sounds += 1;
      if (loaded_sounds == total_sounds) {
          all_loaded = true;
          console.log('Sound loading complete');
          setTimeout(playFromQueueExchange1, Math.floor(Math.random() * 800) + 500);
          setTimeout(playFromQueueExchange2, Math.floor(Math.random() * 1200) + 700);
          setTimeout(playFromQueueExchange3, Math.floor(Math.random() * 1400) + 1200);
          //setTimeout(playFromQueueExchange4, Math.floor(Math.random() * 1600) + 1400);
          //setTimeout(playFromQueueExchange5, Math.floor(Math.random() * 1800) + 1600);
      }
  }

  // load celesta and clav sounds
  for (var i = 1; i <= 24; i++) {
      if (i > 9) {
          fn = 'c0' + i;
      } else {
          fn = 'c00' + i;
      }
      celesta.push(new Howl({
          src : ['static/public/sounds/celesta/' + fn + '.ogg',
                  'static/public/sounds/celesta/' + fn + '.mp3'],
          volume : 0.3,
          onload : sound_load(),
      }))
      clav.push(new Howl({
          src : ['static/public/sounds/clav/' + fn + '.ogg',
                  'static/public/sounds/clav/' + fn + '.mp3'],
          volume : 0.3,
          onload : sound_load(),
      }))
  }

  // load swell sounds
  for (var i = 1; i <= 3; i++) {
      swells.push(new Howl({
          src : ['static/public/sounds/swells/swell' + i + '.ogg',
                  'static/public/sounds/swells/swell' + i + '.mp3'],
          volume : 1,
          onload : sound_load(),
      }));
  }

});


/**
* Randomly selects a swell audio and plays it
*/
function playRandomSwell() {
    var index = Math.round(Math.random() * (swells.length - 1));
    swells[index].play();
}


/**
* Plays a sound(celesta and clav) based on passed parameters
*/
function playSound(size, type, volume) {
    var max_pitch = 100.0;
    var log_used = 1.0715307808111486871978099;
    var pitch = 100 - Math.min(max_pitch, Math.log(size + log_used) / Math.log(log_used));
    var index = Math.floor(pitch / 100.0 * Object.keys(celesta).length);
    var fuzz = Math.floor(Math.random() * 4) - 2;
    index += fuzz;
    index = Math.min(Object.keys(celesta).length - 1, index);
    index = Math.max(1, index);
    if (current_notes < note_overlap) {
        current_notes++;
        if (type == 'IssuesEvent' || type == 'IssueCommentEvent') {
            celesta[index].play();
        } else if(type == 'PushEvent') {
            clav[index].play();
        }else{
          playRandomSwell();
        }
        setTimeout(function() {
            current_notes--;
        }, note_timeout);
    }
}

// Following are the n numbers of event consumers
// consuming n events per second with a definite delay between them

function playFromQueueExchange1(){
  var event = eventQueue.shift();
  if(event != null && event.message != null){
    playSound(event.message.length, event.type, 0.5);
  }
  setTimeout(playFromQueueExchange1, 1000);
}

function playFromQueueExchange2(){
  var event = eventQueue.shift();
  if(event != null && event.message != null){
    playSound(event.message.length, event.type, 0.7);
  }
  setTimeout(playFromQueueExchange2, 1000);
}

function playFromQueueExchange3(){
  var event = eventQueue.shift();
  if(event != null && event.message != null){
    playSound(event.message.length, event.type, 1);
  }
  setTimeout(playFromQueueExchange3, 1000);
}

function playFromQueueExchange4(){
  var event = eventQueue.shift();
  if(event != null && event.message != null){
    playSound(event.message.length, event.type, 0.2);
  }
  setTimeout(playFromQueueExchange4, 1000);
}

function playFromQueueExchange5(){
  var event = eventQueue.shift();
  if(event != null && event.message != null){
    playSound(event.message.length, event.type, 1);
  }
  setTimeout(playFromQueueExchange5, 1000);
}
