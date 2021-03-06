/* ========================================================================
 * Copyright 2016 Origo
 * Licensed under BSD 2-Clause (https://github.com/origo-map/origo/blob/master/LICENSE.txt)
 * ======================================================================== */
"use strict";

var ol = require('ol');
var $ = require('jquery');
var viewer = require('../viewer');

var dispatcher = require('./drawdispatcher');
import drawHandler from './drawhandler';

var activeClass = 'o-control-active';
var disableClass = 'o-disabled';
var $drawPolygon = undefined;
var $drawLineString = undefined;
var $drawPoint = undefined;
var $drawText = undefined;
var $drawDelete = undefined;
var $drawClose = undefined;
var drawTools = undefined;

function init(opt_options) {
  var options = opt_options || {};

  drawHandler.init(options);
  render();

  $(document).on('enableInteraction', onEnableInteraction);
  $(document).on('changeDraw', changeDrawState);

  bindUIActions();

  if (options.isActive) {
    setActive(true);
    dispatcher.emitEnableInteraction();
  }
}

function render() {
  $("#o-map").append("<div id='o-draw-toolbar' class='o-control o-toolbar o-padding-horizontal-8 o-rounded-top o-hidden'>"+
  "<button id='o-draw-point' class='o-btn-3' type='button' name='button'>"+
    "<svg class='o-icon-fa-map-marker'>"+
        "<use xlink:href='#fa-map-marker'></use>"+
    "</svg>"+
  "</button>"+
  "<button id='o-draw-polygon' class='o-btn-3' type='button' name='button'>"+
      "<svg class='o-icon-minicons-square-vector'>"+
          "<use xlink:href='#minicons-square-vector'></use>"+
      "</svg>"+
  "</button>"+
  "<button id='o-draw-polyline' class='o-btn-3' type='button' name='button'>"+
    "<svg class='o-icon-minicons-line-vector'>"+
        "<use xlink:href='#minicons-line-vector'></use>"+
    "</svg>"+
  "</button>"+
  "<button id='o-draw-text' class='o-btn-3' type='button' name='button'>"+
    "<svg class='o-icon-fa-font'>"+
        "<use xlink:href='#fa-font'></use>"+
    "</svg>"+
  "</button>"+
  "<button id='o-draw-delete' class='o-btn-3' type='button' name='button'>"+
    "<svg class='o-icon-fa-trash'>"+
        "<use xlink:href='#fa-trash'></use>"+
    "</svg>"+
  "</button>"+
  "<button id='o-draw-close' class='o-btn-3' type='button' name='button'>"+
      "<svg class='o-icon-fa-times'>"+
          "<use xlink:href='#fa-times'></use>"+
      "</svg>"+
  "</button>"+
"</div>"
);
  $drawPolygon = $('#o-draw-polygon');
  $drawLineString = $('#o-draw-polyline');
  $drawPoint = $('#o-draw-point');
  $drawText = $('#o-draw-text');
  $drawDelete = $('#o-draw-delete');
  $drawClose = $('#o-draw-close');
  drawTools = {
    Point: $drawPoint,
    LineString: $drawLineString,
    Polygon: $drawPolygon,
    Text: $drawText
  };
}

function bindUIActions() {
  $drawDelete.on('click', function(e) {
    dispatcher.emitToggleDraw('delete');
    $drawDelete.blur();
    e.preventDefault();
  });
  $drawPolygon.on('click', function(e) {
    dispatcher.emitToggleDraw('Polygon');
    $drawPolygon.blur();
    e.preventDefault();
  });
  $drawLineString.on('click', function(e) {
    dispatcher.emitToggleDraw('LineString');
    $drawLineString.blur();
    e.preventDefault();
  });
  $drawPoint.on('click', function(e) {
    dispatcher.emitToggleDraw('Point');
    $drawPoint.blur();
    e.preventDefault();
  });
  $drawText.on('click', function(e) {
    dispatcher.emitToggleDraw('Text');
    $drawText.blur();
    e.preventDefault();
  });
  $drawClose.on('click', function(e) {
    $('.o-map').first().trigger({
      type: 'enableInteraction',
      interaction: 'featureInfo'
    });
    $drawClose.blur();
    e.stopPropagation();
    e.preventDefault();
  });
}

function onEnableInteraction(e) {
  e.stopPropagation();
  if (e.interaction === 'draw') {
    setActive(true);
  } else {
    setActive(false);
    dispatcher.emitToggleDraw('cancel');
  }
}

function setActive(state) {
  if (state === true) {
    $('#o-draw-toolbar').removeClass('o-hidden');
  } else {
    $('#o-draw-toolbar').addClass('o-hidden');
  }
}

function changeDrawState(e) {
  var tools = Object.getOwnPropertyNames(drawTools);
  tools.forEach(function(tool) {
    if (tool === e.tool) {
      toggleState(drawTools[tool], e.active);
    } else {
      toggleState(drawTools[tool], false);
    }
  });

  function toggleState(tool, state) {
    if (state === false) {
      tool.removeClass(activeClass);
    } else {
      tool.addClass(activeClass);
    }
  }
}

function getState() {
  return drawHandler.getState();
}

function restoreState(state) {
  return drawHandler.restoreState(state);
}

export default {
  getState,
  restoreState,
  init
};
