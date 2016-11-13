var eventQueue = [];
var svg;
var element;
var drawingArea;
var width;
var height;
var volume = 0.6;
var ULTIMATE_DREAM_KILLER = false;  // https://github.com/debugger22/github-audio/pull/19
var orgRepoFilterNames = [];

var scaleFactor = 6,
    noteOverlap = 2,
    noteTimeout = 300,
    currentNotes = 0,
    maxLife = 20000;

var svgBackgroundColorOnline = '#0288D1',
    svgBackgroundColorOffline = '#E91E63',
    svgTextColor = '#FFFFFF',
    editColor = '#fff',
    totalSounds = 51;

    var celesta = [],
        clav = [],
        swells = [];



var socket = io();
socket.on('github', function(data) {
  $('.online-users-count').html(data.connectedUsers);
  data.data.forEach(function(event) {
    if (!isEventInQueue(event)) {
      // Filter out events only specified by the user
      if (orgRepoFilterNames != []) {
        // Don't consider pushes to github.io repos when org filter is on
        if (new RegExp(orgRepoFilterNames.join("|")).test(event.repo_name)
           && event.repo_name.indexOf('github.io') == -1) {
          eventQueue.push(event);
        }
      } else {
        eventQueue.push(event);
      }
    }
  });
  // Don't let the eventQueue grow more than 1000
  if (eventQueue.length > 1000) eventQueue = eventQueue.slice(0, 1000);
});

socket.on('connect', function() {
    if (svg != null) {
      $('svg').css('background-color', svgBackgroundColorOnline);
      $('header').css('background-color', svgBackgroundColorOnline);
      $('.offline-text').css('visibility', 'hidden');
      $('.events-remaining-text').css('visibility', 'hidden');
      $('.events-remaining-value').css('visibility', 'hidden');
    }
});

socket.on('disconnect', function() {
    if (svg != null) {
      $('svg').css('background-color', svgBackgroundColorOffline);
      $('header').css('background-color', svgBackgroundColorOffline);
      $('.offline-text').css('visibility', 'visible');
      $('.events-remaining-text').css('visibility', 'visible');
      $('.events-remaining-value').css('visibility', 'visible');

    }
});

socket.on('error', function() {
    if (svg != null) {
      $('svg').css('background-color', svgBackgroundColorOffline);
      $('header').css('background-color', svgBackgroundColorOffline);
      $('.offline-text').css('visibility', 'visible');
      $('.events-remaining-text').css('visibility', 'visible');
      $('.events-remaining-value').css('visibility', 'visible');
    }
});


/**
* This function checks whether an event is already in the queue
*/
function isEventInQueue(event) {
  for (var i = 0; i < eventQueue.length; i++) {
    if (eventQueue[i].id == event.id)
      return true;
  }
  return false;
}

/**
 * This function adds a filter for events that we don't want to hear.
 *
 * To extend this function, simply add return true for events that should be filtered.
 */
function shouldEventBeIgnored(event) {
  // This adds an easter egg to only play closed PRs
  if (!!ULTIMATE_DREAM_KILLER)
    return (event.type !== "PullRequestEvent" || event.action !== "closed");

  return false;
}


$(function() {
  element = document.documentElement;
  drawingArea = document.getElementsByTagName('#area')[0];
  width = window.innerWidth || element.clientWidth || drawingArea.clientWidth;
  height = (window.innerHeight - $('header').height()) || (element.clientHeight - $('header').height()) || (drawingArea.clientHeight - $('header').height());
  $('svg').css('background-color', svgBackgroundColorOnline);
  $('header').css('background-color', svgBackgroundColorOnline);
  $('svg text').css('color', svgTextColor);
  $('#volumeSlider').slider({
    'max': 100,
    'min': 0,
    'value': volume * 100,
    'slide': function(event, ui) {
      volume = ui.value / 100.0;
      Howler.volume(volume);
    },
    'change': function(event, ui) {
      volume = ui.value / 100.0;
      Howler.volume(volume);
    }
  });

  // Main drawing area
  svg = d3.select("#area").append("svg");
  svg.attr({width: width, height: height});
  svg.style('background-color', svgBackgroundColorOnline);

  // For window resizes
  var updateWindow = function() {
      width = window.innerWidth || element.clientWidth || drawingArea.clientWidth;
      height = (window.innerHeight - $('header').height()) || (element.clientHeight - $('header').height()) || (drawingArea.clientHeight - $('header').height());
      svg.attr("width", width).attr("height", height);
  };
  window.onresize = updateWindow;
  updateWindow();

  var loadedSounds = 0;
  var soundLoad = function() {
      loadedSounds += 1;
      if (loadedSounds == totalSounds) {
          setTimeout(playFromQueueExchange1, Math.floor(Math.random() * 1000));
          // Starting the second exchange makes music a bad experience
          // setTimeout(playFromQueueExchange2, Math.floor(Math.random() * 2000));
      }
  };

  // Load sounds
  for (var i = 1; i <= 24; i++) {
      if (i > 9) {
          fn = 'c0' + i;
      } else {
          fn = 'c00' + i;
      }
      celesta.push(new Howl({
          src: ['https://d1fz9d31zqor6x.cloudfront.net/sounds/celesta/' + fn + '.ogg',
                  'https://d1fz9d31zqor6x.cloudfront.net/sounds/celesta/' + fn + '.mp3'],
          volume: 0.7,
          onload: soundLoad(),
          buffer: true
      }));
      clav.push(new Howl({
          src: ['https://d1fz9d31zqor6x.cloudfront.net/sounds/clav/' + fn + '.ogg',
                  'https://d1fz9d31zqor6x.cloudfront.net/sounds/clav/' + fn + '.mp3'],
          volume: 0.4,
          onload: soundLoad(),
          buffer: true
      }));
  }

  for (var i = 1; i <= 3; i++) {
      swells.push(new Howl({
          src: ['https://d1fz9d31zqor6x.cloudfront.net/sounds/swells/swell' + i + '.ogg',
                  'https://d1fz9d31zqor6x.cloudfront.net/sounds/swells/swell' + i + '.mp3'],
          volume: 1,
          onload: soundLoad(),
          buffer: true
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
    var maxPitch = 100.0;
    var logUsed = 1.0715307808111486871978099;
    var pitch = 100 - Math.min(maxPitch, Math.log(size + logUsed) / Math.log(logUsed));
    var index = Math.floor(pitch / 100.0 * Object.keys(celesta).length);
    var fuzz = Math.floor(Math.random() * 4) - 2;
    index += fuzz;
    index = Math.min(Object.keys(celesta).length - 1, index);
    index = Math.max(1, index);
    if (currentNotes < noteOverlap) {
        currentNotes++;
        if (type == 'IssuesEvent' || type == 'IssueCommentEvent') {
            clav[index].play();
        } else if (type == 'PushEvent') {
            celesta[index].play();
        } else {
          playRandomSwell();
        }
        setTimeout(function() {
            currentNotes--;
        }, noteTimeout);
    }
}

// Following are the n numbers of event consumers
// consuming n events each per second with a random delay between them

function playFromQueueExchange1() {
  var event = eventQueue.shift();
  if (event != null && event.message != null && !shouldEventBeIgnored(event) && svg != null) {
    playSound(event.message.length * 1.1, event.type);
    if (!document.hidden)
      drawEvent(event, svg);
  }
  setTimeout(playFromQueueExchange1, Math.floor(Math.random() * 1000) + 500);
  $('.events-remaining-value').html(eventQueue.length);
}

function playFromQueueExchange2() {
  var event = eventQueue.shift();
  if (event != null && event.message != null && !shouldEventBeIgnored(event) && svg != null) {
    playSound(event.message.length, event.type);
    if (!document.hidden)
      drawEvent(event, svg);
  }
  setTimeout(playFromQueueExchange2, Math.floor(Math.random() * 800) + 500);
  $('.events-remaining-value').html(eventQueue.length);
}

// This method capitalizes the string in place
String.prototype.capitalize = function(all) {
    if (all) {
      return this.split(' ').map(function(e) {
        return e.capitalize().join(' ');
      });
    } else {
         return this.charAt(0).toUpperCase() + this.slice(1);
    }
};


function drawEvent(data, svgArea) {
    var startingOpacity = 1;
    var opacity = 1 / (100 / data.message.length);
    if (opacity > 0.5) {
        opacity = 0.5;
    }
    var size = data.message.length;
    var labelText;
    var ringRadius = 80;
    var ringAnimDuration = 3000;
    svgTextColor = '#FFFFFF';
    switch (data.type) {
      case "PushEvent":
        labelText = data.user.capitalize() + " pushed to " + data.repo_name;
        editColor = '#B2DFDB';
      break;
      case "PullRequestEvent":
        labelText = data.user.capitalize() + " " +
          data.action + " " + " a PR for " + data.repo_name;
          editColor = '#C6FF00';
          ringAnimDuration = 10000;
          ringRadius = 600;
      break;
      case "IssuesEvent":
        labelText = data.user.capitalize() + " " +
          data.action + " an issue in " + data.repo_name;
          editColor = '#FFEB3B';
      break;
      case "IssueCommentEvent":
        labelText = data.user.capitalize() + " commented in " + data.repo_name;
        editColor = '#FF5722';
      break;
    }
    var type = data.type;

    var absSize = Math.abs(size);
    size = Math.max(Math.sqrt(absSize) * scaleFactor, 3);

    Math.seedrandom(data.message);
    var x = Math.random() * (width - size) + size;
    var y = Math.random() * (height - size) + size;


    var circleGroup = svgArea.append('g')
        .attr('transform', 'translate(' + x + ', ' + y + ')')
        .attr('fill', editColor)
        .style('opacity', startingOpacity);


    var ring = circleGroup.append('circle');
    ring.attr({r: size, stroke: 'none'});
    ring.transition()
        .attr('r', size + ringRadius)
        .style('opacity', 0)
        .ease(Math.sqrt)
        .duration(ringAnimDuration)
        .remove();

    var circleContainer = circleGroup.append('a');
    circleContainer.attr('xlink:href', data.url);
    circleContainer.attr('target', '_blank');
    circleContainer.attr('fill', svgTextColor);

    var circle = circleContainer.append('circle');
    circle.classed(type, true);
    circle.attr('r', size)
      .attr('fill', editColor)
      .transition()
      .duration(maxLife)
      .style('opacity', 0)
      .remove();


    circleContainer.on('mouseover', function() {
      circleContainer.append('text')
          .text(labelText)
          .classed('label', true)
          .attr('text-anchor', 'middle')
          .attr('font-size', '0.8em')
          .transition()
          .delay(1000)
          .style('opacity', 0)
          .duration(2000)
          .remove();
    });

    circleContainer.append('text')
        .text(labelText)
        .classed('article-label', true)
        .attr('text-anchor', 'middle')
        .attr('font-size', '0.8em')
        .transition()
        .delay(2000)
        .style('opacity', 0)
        .duration(5000)
        .remove();

  // Remove HTML of decayed events
  // Keep it less than 50
  if ($('#area svg g').length > 50) {
    $('#area svg g:lt(10)').remove();
  }
}
