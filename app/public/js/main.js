var eventQueue = [];
var svg;
var element;
var drawingArea;
var width;
var height;
var volume = 0.6;
var ULTIMATE_DREAM_KILLER = false;  // https://github.com/debugger22/github-audio/pull/19
var orgRepoFilterNames = [];

var scale_factor = 6,
    note_overlap = 2,
    note_timeout = 300,
    current_notes = 0,
    max_life = 20000;

var svg_background_color_online = '#32746D', //'#0288D1',
    svg_background_color_offline = '#E91E63',
    svg_text_color = '#FFFFFF',
    newuser_box_color = 'rgb(41, 128, 185)',
    push_color = 'rgb(155, 89, 182)',
    issue_color = 'rgb(46, 204, 113)',
    pull_request_color = 'rgb(46, 204, 113)',
    comment_color = 'rgb(46, 204, 113)',
    edit_color = '#fff',
    total_sounds = 51;

    var celesta = [],
        clav = [],
        swells = [],
        all_loaded = false;


const ws = new WebSocket('ws://localhost:8000/events/');

ws.addEventListener('message', (event) => {
  var events = JSON.parse(event.data);
  console.log(events);
  // $('.online-users-count').html(data.connected_users);
  events.forEach(function(event){
    // Filter out events only specified by the user
    if(orgRepoFilterNames != []){
      // Don't consider pushes to github.io repos when org filter is on
      if(new RegExp(orgRepoFilterNames.join("|")).test(event.repo.name)
          && event.repo.name.indexOf('github.io') == -1){
        eventQueue.push(event);
      }
    }else{
      eventQueue.push(event);
    }
  });
  // Don't let the eventQueue grow more than 128
  if (eventQueue.length > 128) eventQueue = eventQueue.slice(0, 128);
});

ws.addEventListener('open', (event) => {
    if(svg != null){
      $('svg').css('background-color', svg_background_color_online);
      $('header').css('background-color', svg_background_color_online);
      $('.offline-text').css('visibility', 'hidden');
      $('.events-remaining-text').css('visibility', 'hidden');
      $('.events-remaining-value').css('visibility', 'hidden');
    }
});

ws.addEventListener('close', (event) => {
    if(svg != null){
      $('svg').css('background-color', svg_background_color_offline);
      $('header').css('background-color', svg_background_color_offline);
      $('.offline-text').css('visibility', 'visible');
      $('.events-remaining-text').css('visibility', 'visible');
      $('.events-remaining-value').css('visibility', 'visible');

    }
});

ws.addEventListener('error', (event) => {
    if(svg != null){
      $('svg').css('background-color', svg_background_color_offline);
      $('header').css('background-color', svg_background_color_offline);
      $('.offline-text').css('visibility', 'visible');
      $('.events-remaining-text').css('visibility', 'visible');
      $('.events-remaining-value').css('visibility', 'visible');
    }
});

/**
 * This function adds a filter for events that we don't want to hear.
 *
 * To extend this function, simply add return true for events that should be filtered.
 */
function shouldEventBeIgnored(event){
  // This adds an easter egg to only play closed PRs
  if (!!ULTIMATE_DREAM_KILLER)
    return (event.type !== "PullRequestEvent" || event.action !== "closed");

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
  $('#volumeSlider').slider({
    'max': 100,
    'min': 0,
    'value': volume*100,
    'slide' : function(event, ui){
      volume = ui.value/100.0;
      Howler.volume(volume);
    },
    'change' : function(event, ui){
      volume = ui.value/100.0;
      Howler.volume(volume);
    }
  });

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
          src : ['https://d1fz9d31zqor6x.cloudfront.net/sounds/celesta/' + fn + '.ogg',
                  'https://d1fz9d31zqor6x.cloudfront.net/sounds/celesta/' + fn + '.mp3'],
          volume : 0.7,
          onload : sound_load(),
          buffer: true,
      }))
      clav.push(new Howl({
          src : ['https://d1fz9d31zqor6x.cloudfront.net/sounds/clav/' + fn + '.ogg',
                  'https://d1fz9d31zqor6x.cloudfront.net/sounds/clav/' + fn + '.mp3'],
          volume : 0.4,
          onload : sound_load(),
          buffer: true,
      }))
  }

  for (var i = 1; i <= 3; i++) {
      swells.push(new Howl({
          src : ['https://d1fz9d31zqor6x.cloudfront.net/sounds/swells/swell' + i + '.ogg',
                  'https://d1fz9d31zqor6x.cloudfront.net/sounds/swells/swell' + i + '.mp3'],
          volume : 1,
          onload : sound_load(),
          buffer: true,
      }));
  }

  Howler.volume(volume);

  // Make header and footer visible
  $('body').css('visibility', 'visible');

  $('#org-repo-filter-name').on('input', function() {
    orgRepoFilterNames = $('#org-repo-filter-name').val().split(' ');
    eventQueue = [];
  });

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
  if(event != null && event.actor.display_login != null && !shouldEventBeIgnored(event) && svg != null){
    playSound(event.actor.display_login.length*1.1, event.type);
    if(!document.hidden)
      drawEvent(event, svg);
  }else{
    console.log("Ignored ex 1");
  }
  setTimeout(playFromQueueExchange1, Math.floor(Math.random() * 1000) + 500);
  $('.events-remaining-value').html(eventQueue.length);
}

function playFromQueueExchange2(){
  var event = eventQueue.shift();
  if(event != null && event.actor.display_login != null && !shouldEventBeIgnored(event) && svg != null){
    playSound(event.actor.display_login.length, event.type);
    if(!document.hidden)
      drawEvent(event, svg);
  }else{
    console.log("Ignored ex 2");
  }
  setTimeout(playFromQueueExchange2, Math.floor(Math.random() * 800) + 500);
  $('.events-remaining-value').html(eventQueue.length);
}

// This method capitalizes the string in place
String.prototype.capitalize=function(all){
    if(all){
      return this.split(' ').map(function(e){
        return e.capitalize().join(' ');
      });
    }else{
         return this.charAt(0).toUpperCase() + this.slice(1);
    }
}


function drawEvent(data, svg_area) {
    var starting_opacity = 1;
    var opacity = 1 / (100 / data.actor.display_login.length);
    if (opacity > 0.5) {
        opacity = 0.5;
    }
    var size = data.actor.display_login.length;
    var label_text;
    var ring_radius = 80;
    var ring_anim_duration = 3000;
    svg_text_color = '#FFFFFF';
    switch(data.type){
      case "PushEvent":
        label_text = data.actor.display_login.capitalize() + " pushed to " + data.repo.name;
        edit_color = '#FFF9A5';
      break;
      case "PullRequestEvent":
        label_text = data.actor.display_login.capitalize() + " " +
          data.action + " " + " a PR for " + data.repo.name;
          edit_color = '#C6FF00';
          ring_anim_duration = 10000;
          ring_radius = 600;
      break;
      case "IssuesEvent":
        label_text = data.actor.display_login.capitalize() + " " +
          data.action + " an issue in " + data.repo.name;
          edit_color = '#DFEFCA';
      break;
      case "IssueCommentEvent":
        label_text = data.actor.display_login.capitalize() + " " + data.action + " in " + data.repo.name;
        edit_color = '#CCDDD3';
      break;
    }
    var csize = size;
    var no_label = false;
    var type = data.type;

    var circle_id = 'd' + ((Math.random() * 100000) | 0);
    var abs_size = Math.abs(size);
    size = Math.max(Math.sqrt(abs_size) * scale_factor, 3);

    Math.seedrandom(data.event_url)
    var x = Math.random() * (width - size) + size;
    var y = Math.random() * (height - size) + size;


    var circle_group = svg_area.append('g')
        .attr('transform', 'translate(' + x + ', ' + y + ')')
        .attr('fill', edit_color)
        .style('opacity', starting_opacity)


    var ring = circle_group.append('circle');
    ring.attr({r: size, stroke: 'none'});
    ring.transition()
        .attr('r', size + ring_radius)
        .style('opacity', 0)
        .ease(Math.sqrt)
        .duration(ring_anim_duration)
        .remove();

    var circle_container = circle_group.append('a');
    circle_container.attr('xlink:href', data.event_url);
    circle_container.attr('target', '_blank');
    circle_container.attr('fill', svg_text_color);

    var circle = circle_container.append('circle');
    circle.classed(type, true);
    circle.attr('r', size)
      .attr('fill', edit_color)
      .transition()
      .duration(max_life)
      .style('opacity', 0)
      .remove();


    circle_container.on('mouseover', function() {
      circle_container.append('text')
          .text(label_text)
          .classed('label', true)
          .attr('text-anchor', 'middle')
          .attr('y', '0.3em')
          .transition()
          .delay(10)
          .style('opacity', 0)
          .duration(200)
          .each(function() { no_label = true; })
          .remove();
    });

    circle_container.append('text')
        .text(label_text)
        .classed('article-label', true)
        .attr('text-anchor', 'middle')
        .attr('y', '0.3em')
        .transition()
        .delay(2000)
        .style('opacity', 0)
        .duration(5000)
        .each(function() { no_label = true; })
        .remove();

  // Remove HTML of decayed events
  // Keep it less than 50
  if($('#area svg g').length > 50){
    $('#area svg g:lt(10)').remove();
  }
}
