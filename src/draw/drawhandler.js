/* ========================================================================
 * Copyright 2016 Origo
 * Licensed under BSD 2-Clause (https://github.com/origo-map/origo/blob/master/LICENSE.txt)
 * ======================================================================== */
"use strict";

var ol = require('ol');
var $ = require('jquery');
import viewer from '../viewer';
import Select from 'ol/interaction/select';
import Modify from 'ol/interaction/modify';
import Draw from 'ol/interaction/draw';
import DoubleClickZoom from 'ol/interaction/doubleclickzoom';
import modal from '../modal';
import GeoJSON from 'ol/format/geojson';
var dispatcher = require('./drawdispatcher');
import featureLayer from '../featurelayer';
var defaultDrawStyle = require('./drawstyle');
import textForm from './textform';
//var style = require('../style')();
import Style from '../style';
const style = Style();

var map = undefined;
var drawLayer = undefined;
var draw = undefined;
var activeTool = undefined;
var select = undefined;
var modify = undefined;
var annotationField = undefined;
var promptTitle = undefined;
var placeholderText = undefined;

//module.exports = 
const init = function(opt_options) {
  var options = opt_options || {};
  var drawStyle = style.createStyleRule(defaultDrawStyle.draw);
  var selectStyle = style.createStyleRule(defaultDrawStyle.select);
  map = viewer.getMap();

  annotationField = options.annonation || 'annonation';
  promptTitle = options.promptTitle || 'Ange text';
  placeholderText = options.placeholderText || 'Text som visas i kartan';
  drawLayer = featureLayer(undefined, map).getFeatureLayer();
  drawLayer.setStyle(drawStyle);
  activeTool = undefined;

  select = new Select({
    layers: [drawLayer],
    style: selectStyle
  });
  modify = new Modify({
    features: select.getFeatures()
  });
  map.addInteraction(select);
  map.addInteraction(modify);
  select.getFeatures().on('add', onSelectAdd, this);
  setActive();
  $(document).on('toggleDraw', toggleDraw);
}

function setDraw(drawType) {
  var geometryType = drawType;
  activeTool = drawType;
  if (activeTool === 'Text') {
    geometryType = 'Point';
  }
  draw = new Draw({
    source: drawLayer.getSource(),
    'type': geometryType
  });
  map.addInteraction(draw);
  dispatcher.emitChangeDraw(drawType, true);
  draw.on('drawend', onDrawEnd, this);
  draw.on('drawstart', onDrawStart, this);
  // map.on('dblclick', onDoubleClick, this);
}

function onDeleteSelected() {
  var features = select.getFeatures();
  var source;
  if (features.getLength()) {
    source = drawLayer.getSource();
    features.forEach(function(feature) {
      source.removeFeature(feature);
    });
    select.getFeatures().clear();
  }
}

function onSelectAdd(e) {
  var feature;
  if (e.target) {
    feature = e.target.item(0);
    if (feature.get(annotationField)) {
      promptText(feature);
    }
  }
}

function onDrawStart(evt) {
  if (evt.feature.getGeometry().getType() != 'Point')
    disableDoubleClickZoom(evt);
}

function onDrawEnd(evt) {
  if (activeTool === 'Text') {
    promptText(evt.feature);
  } else {
    setActive();
    activeTool = undefined;
    dispatcher.emitChangeDraw(evt.feature.getGeometry().getType(), false);
  }
  enableDoubleClickZoom(evt);
}

function disableDoubleClickZoom(evt) {
  var featureType = evt.feature.getGeometry().getType();
  if (featureType == 'Point') {
    return;
  }
  map.getInteractions().forEach(function(interaction) {
    if (interaction instanceof DoubleClickZoom) {
      map.removeInteraction(interaction);
    }
  });
}

function enableDoubleClickZoom(evt) {
  setTimeout(function() {
    addDoubleClickZoomInteraction();
  }, 100);
}

function addDoubleClickZoomInteraction() {
  var allDoubleClickZoomInteractions = [];
  map.getInteractions().forEach(function(interaction) {
    if (interaction instanceof DoubleClickZoom) {
      allDoubleClickZoomInteractions.push(interaction);
    }
  });
  if (allDoubleClickZoomInteractions.length < 1) {
    map.addInteraction(new DoubleClickZoom());
  }
}

function promptText(feature) {
  var content = textForm.createForm({
    value: feature.get(annotationField) || '',
    placeHolder: placeholderText
  });
  modal.createModal('#o-map', { title: promptTitle, content: content });
  modal.showModal();
  $('#o-draw-save-text').on('click', function(e) {
    var textVal = $('#o-draw-input-text').val();
    modal.closeModal();
    $('#o-draw-save-text').blur();
    e.preventDefault();
    onTextEnd(feature, textVal);
  });
}

function onTextEnd(feature, textVal) {
  var text = defaultDrawStyle.text;
  text.text.text = textVal;
  var textStyle = style.createStyleRule([text]);
  feature.setStyle(textStyle);
  feature.set(annotationField, textVal);
  setActive();
  activeTool = undefined;
  dispatcher.emitChangeDraw('Text', false);
}

function cancelDraw() {
  setActive();
  activeTool = undefined;
  dispatcher.emitChangeDraw('cancel', false);
}

function isActive() {
  if (modify === undefined || select === undefined) {
    return false;
  } else {
    return true;
  }
}

function removeInteractions() {
  if (isActive()) {
    map.removeInteraction(modify);
    map.removeInteraction(select);
    map.removeInteraction(draw);
    modify = undefined;
    select = undefined;
    draw = undefined;
  }
}

function toggleDraw(e) {
  e.stopPropagation();
  if (e.tool === 'delete') {
    onDeleteSelected();
  } else if (e.tool === 'cancel') {
    // removeInteractions();
    cancelDraw();
  } else if (e.tool === activeTool) {
    cancelDraw();
  } else if (e.tool === 'Polygon' || e.tool === 'LineString' || e.tool === 'Point' || e.tool === 'Text') {
    if (activeTool) {
      cancelDraw();
    }
    setActive('draw');
    setDraw(e.tool);
  }
}

function setActive(drawType) {
  switch (drawType) {
    case 'draw':
      select.getFeatures().clear();
      modify.setActive(true);
      select.setActive(false);
      break;
    default:
      activeTool = undefined;
      map.removeInteraction(draw);
      modify.setActive(true);
      select.setActive(true);
      break;
  }
}

function getState() {
  if (drawLayer) {
    var source = drawLayer.getSource();
    var geojson = new GeoJSON();
    var features = source.getFeatures();
    var json = geojson.writeFeatures(features);
    return { features: json };
  }
};

function restoreState(state) {
  //TODO: Sanity/data check
  if (state.features && state.features.length > 0) {
    var source = drawLayer.getSource();
    source.addFeatures(state.features);
    source.getFeatures().forEach(function(feature) {
      if (feature.get(annotationField)) {
        onTextEnd(feature, feature.get(annotationField));
      }
    });
  }
};

export default { init, getState,restoreState };


