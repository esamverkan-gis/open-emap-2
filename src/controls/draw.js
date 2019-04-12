/* ========================================================================
 * Copyright 2016 Origo
 * Licensed under BSD 2-Clause (https://github.com/origo-map/origo/blob/master/LICENSE.txt)
 * ======================================================================== */
 "use strict";

var $ = require('jquery');
import utils from '../utils';
import drawToolbar from '../draw/drawtoolbar';

var $drawButton;

function init(options) {
  render();
  $drawButton = $('#o-draw-button');
  bindUIActions();
  drawToolbar.init(options);
  if(options && options.state){
    restoreState(options.state);
  }
}

function bindUIActions() {
  $drawButton.on('click', function(e) {
    $('.o-map').first().trigger({
      type: 'enableInteraction',
      interaction: 'draw'
    });
    this.blur();
    e.stopPropagation();
    e.preventDefault();
  });
}

function render() {
  var el = utils.createListButton({
    id: 'o-draw',
    iconCls: 'o-icon-fa-pencil',
    src: '#fa-pencil',
    text: 'Rita'
  });
  $('#o-menutools').append(el);
}

function getState(){
  return drawToolbar.getState();
}

function restoreState(state){
  drawToolbar.restoreState(state);
}

export default {
  getState,
  restoreState,
  init
};