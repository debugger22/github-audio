var eventQueue = [];
var svg;
var element;
var drawingArea;
var width;
var height;
var mute = false;

var scale_factor = 9,
    note_overlap = 15,
    note_timeout = 300,
    current_notes = 0,
    max_life = 20000;

var svg_background_color_online = '#0288D1',
    svg_background_color_offline = '#E91E63'
    svg_text_color = '#FFFFFF',
    newuser_box_color = 'rgb(41, 128, 185)',
    push_color = 'rgb(155, 89, 182)',
    issue_color = 'rgb(46, 204, 113)',
    pull_request_color = 'rgb(46, 204, 113)',
    comment_color = 'rgb(46, 204, 113)'
    edit_color = '#fff',
    total_sounds = 51,
    total_edits = 0;

    var celesta = [],
        clav = [],
        swells = [],
        all_loaded = false;



var socket = io(document.location.hostname);
socket.on('github', function (data) {
  $('.online-users-count').html(data.connected_users);
  data.data.forEach(function(event){
    if(!isEventInQueue(event)){
      eventQueue.push(event);
    }
  });
  // Don't let the eventQueue grow more than 50
  if (eventQueue.length > 50) eventQueue = eventQueue.slice(0, 50);
});

socket.on('connect', function(){
    if(svg != null){
      $('svg').css('background-color', svg_background_color_online);
      $('header').css('background-color', svg_background_color_online);
      $('.offline-text').css('visibility', 'hidden');
      $('.events-remaining-text').css('visibility', 'hidden');
      $('.events-remaining-value').css('visibility', 'hidden');
      $('.possibly-text').css('visibility', 'hidden');
    }
});

socket.on('disconnect', function(){
    if(svg != null){
      $('svg').css('background-color', svg_background_color_offline);
      $('header').css('background-color', svg_background_color_offline);
      $('.offline-text').css('visibility', 'visible');
      $('.events-remaining-text').css('visibility', 'visible');
      $('.events-remaining-value').css('visibility', 'visible');
      $('.possibly-text').css('visibility', 'visible');

    }
});

socket.on('error', function(){
    if(svg != null){
      $('svg').css('background-color', svg_background_color_offline);
      $('header').css('background-color', svg_background_color_offline);
      $('.offline-text').css('visibility', 'visible');
      $('.events-remaining-text').css('visibility', 'visible');
      $('.events-remaining-value').css('visibility', 'visible');
      $('.possibly-text').css('visibility', 'visible');
    }
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

$(function(){
  element = document.documentElement;
  drawingArea = document.getElementsByTagName('#area')[0];
  width = window.innerWidth || element.clientWidth || drawingArea.clientWidth;
  height = (window.innerHeight  - $('header').height())|| (element.clientHeight - $('header').height()) || (drawingArea.clientHeight - $('header').height());
  $('svg').css('background-color', svg_background_color_online);
  $('header').css('background-color', svg_background_color_online);
  $('svg text').css('color', svg_text_color);

  // Main drawing area
  svg = d3.select("#area").append("svg");
  svg.attr({width: width, height: height});
  svg.style('background-color', svg_background_color_online);

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
          setTimeout(playFromQueueExchange1, Math.floor(Math.random() * 1000));
          // Starting the second exchange makes music a bad experience
          // setTimeout(playFromQueueExchange2, Math.floor(Math.random() * 2000));
      }
  }

  // Load sounds
  for (var i = 1; i <= 24; i++) {
      if (i > 9) {
          fn = 'c0' + i;
      } else {
          fn = 'c00' + i;
      }
      celesta.push(new Howl({
          src : ['static/public/sounds/celesta/' + fn + '.ogg',
                  'static/public/sounds/celesta/' + fn + '.mp3'],
          volume : 0.7,
          onload : sound_load(),
          buffer: true,
      }))
      clav.push(new Howl({
          src : ['static/public/sounds/clav/' + fn + '.ogg',
                  'static/public/sounds/clav/' + fn + '.mp3'],
          volume : 0.4,
          onload : sound_load(),
          buffer: true,
      }))
  }

  for (var i = 1; i <= 3; i++) {
      swells.push(new Howl({
          src : ['static/public/sounds/swells/swell' + i + '.ogg',
                  'static/public/sounds/swells/swell' + i + '.mp3'],
          volume : 1,
          onload : sound_load(),
          buffer: true,
      }));
  }

  $('#cmdMute').click(function(){
    if(mute == true){
      mute = false;
      Howler.mute(mute);
      $('#cmdMute').attr('src', '/static/public/images/speaker.svg');
    }else{
      mute = true;
      Howler.mute(mute);
      $('#cmdMute').attr('src', '/static/public/images/speaker-muted.svg');
    }
  });
  Howler.volume(1);

});


/**
* Randomly selects a swell sound and plays it
*/
function playRandomSwell() {
    var index = Math.round(Math.random() * (swells.length - 1));
    swells[index].play();
}


/**
* Plays a sound(celesta and clav) based on passed parameters
*/
function playSound(size, type) {
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
            clav[index].play();
        } else if(type == 'PushEvent') {
            celesta[index].play();
        }else{
          playRandomSwell();
        }
        setTimeout(function() {
            current_notes--;
        }, note_timeout);
    }
}

// Following are the n numbers of event consumers
// consuming n events each per second with a random delay between them

function playFromQueueExchange1(){
  var event = eventQueue.shift();
  if(event != null && event.message != null && svg != null){
    if(!mute)
      playSound(event.message.length*1.1, event.type);
    if(!document.hidden)
      drawEvent(event, svg);
  }
  setTimeout(playFromQueueExchange1, Math.floor(Math.random() * 1000) + 500);
  $('.events-remaining-value').html(eventQueue.length);
}

function playFromQueueExchange2(){
  var event = eventQueue.shift();
  if(event != null && event.message != null && svg != null){
    if(!mute)
      playSound(event.message.length, event.type);
    if(!document.hidden)
      drawEvent(event, svg);
  }
  setTimeout(playFromQueueExchange2, Math.floor(Math.random() * 1000) + 500);
  $('.events-remaining-value').html(eventQueue.length);
}

// This method capitalizes the string in place
String.prototype.capitalize=function(all){
    if(all){
       return this.split(' ').map(e=>e.capitalize()).join(' ');
    }else{
         return this.charAt(0).toUpperCase() + this.slice(1);
    }
}


function drawEvent(data, svg_area) {
    var starting_opacity = 1;
    var opacity = 1 / (100 / data.message.length);
    if (opacity > 0.5) {
        opacity = 0.5;
    }
    var size = data.message.length;
    var label_text;
    switch(data.type){
      case "PushEvent":
        label_text = data.user.capitalize() + " pushed to " + data.repo_name;
        edit_color = '#FFFFFF';
      break;
      case "PullRequestEvent":
        label_text = data.user.capitalize() + " " +
          data.action + " " + " a PR for " + data.repo_name;
          edit_color = '#18FFFF';
      break;
      case "IssuesEvent":
        label_text = data.user.capitalize() + " " +
          data.action + " an issue in " + data.repo_name;
          edit_color = '#FFFF00';
      break;
      case "IssueCommentEvent":
        label_text = data.user.capitalize() + " commented in " + data.repo_name;
        edit_color = '#FF5722';
      break;
    }
    var csize = size;
    var no_label = false;
    var type = data.type;

    var circle_id = 'd' + ((Math.random() * 100000) | 0);
    var abs_size = Math.abs(size);
    size = Math.max(Math.sqrt(abs_size) * scale_factor, 3);

    Math.seedrandom(data.message)
    var x = Math.random() * (width - size) + size;
    var y = Math.random() * (height - size) + size;


    var circle_group = svg_area.append('g')
        .attr('transform', 'translate(' + x + ', ' + y + ')')
        .attr('fill', edit_color)
        .style('opacity', starting_opacity)

    var ring = circle_group.append('circle');
    ring.attr({r: size + 20, stroke: 'none'});
    ring.transition()
         .attr('r', size + 40)
         .style('opacity', 0)
         .ease(Math.sqrt)
         .duration(2500);
    ring.remove();

    var circle_container = circle_group.append('a');
    circle_container.attr('xlink:href', 'https://github.com/' + data.repo_name);
    circle_container.attr('target', '_blank');
    circle_container.attr('fill', svg_text_color);

    var circle = circle_container.append('circle');
    circle.classed(type, true);
    circle.attr('r', size)
      .attr('fill', edit_color)
      .transition()
      .duration(max_life)
      .style('opacity', 0)
    //circle.each('end', function(){
    //        circle_group.remove();
    //})
      .remove();


    circle_container.on('mouseover', function() {
      circle_container.append('text')
          .text(label_text)
          .classed('label', true)
          .attr('text-anchor', 'middle')
          .transition()
          .delay(1000)
          .style('opacity', 0)
          .duration(5000)
          //.each('end', function() { no_label = true; })
          .remove();
    });

    var text = circle_container.append('text')
        .text(label_text)
        .classed('article-label', true)
        .attr('text-anchor', 'middle')
        .transition()
        .delay(1000)
        .style('opacity', 0)
        .duration(2000)
        //.each('end', function() { no_label = true; })
        .remove();
}
