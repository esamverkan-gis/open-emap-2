/* ========================================================================
 * Copyright 2016 Origo
 * Licensed under BSD 2-Clause (https://github.com/origo-map/origo/blob/master/LICENSE.txt)
 * ======================================================================== */
"use strict";

var origoApi = {};

origoApi.init = function(afterInitializationCallback, options) {

  var apiOptions = {};
  if(options) {
    apiOptions = options;
  }

  var configFileName = apiOptions.configFileName || 'api-standard.json';
  
  origoApi.viewer = origo.map.init(configFileName, apiOptions,
    function() {
      afterInitializationCallback();
    });
};

origoApi.setZoom = function(zoom) {
  origo.api.setZoom(zoom);
};

origoApi.setCenter = function(coordinates) {
  origo.api.setCenter(coordinates);
};

origoApi.addLayer = function(layerName) {
	origo.api.addLayer(layerName);
};

origoApi.addFeatures = function(featureCollection, layerName) {
  origo.api.addFeatures(featureCollection, layerName);
};

origoApi.onFeatureClicked = function(onClickCallback1) {
	origo.api.onFeatureClicked(onClickCallback1);
};

origoApi.setLayerStyle = function(styles, layerName) {
	origo.api.setLayerStyle(styles, layerName);
};

origoApi.setFeatureStyle = function(feature, style) {
	origo.api.setFeatureStyle(feature, style);
};

origoApi.showPopupForThisFeature = function(feature, title, htmlContent) {
  origo.api.showPopupForThisFeature(feature, title, htmlContent);
};