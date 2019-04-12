/* ========================================================================
 * Copyright 2016 Origo
 * Licensed under BSD 2-Clause (https://github.com/origo-map/origo/blob/master/LICENSE.txt)
 * ======================================================================== */
"use strict";
import $ from 'jquery';
import viewer from './viewer';
import maputils from './maputils';
import ol from 'ol';
import Circle from 'ol/style/circle';
import Fill from 'ol/style/fill';
import Stroke from 'ol/style/stroke';
import Style from 'ol/style/style';

import Popup from './popup';
import mapUtils from './maputils';

var map;
var vectorLayer;
var vectorSource;
var format;
var styles = {};

function init(options) {
  map = Viewer.getMap();
}

var allLayersStyles = {};
var allLayersNames = [];

var defaultImage = new Circle({
  radius: 5,
  fill: null,
  stroke: new Stroke({
    color: 'red',
    width: 1
  })
});

var defaultStyles = {
  'Point': new Style({
    image: defaultImage
  }),
  'LineString': new Style({
    stroke: new Stroke({
      color: 'green',
      width: 1
    })
  }),
  'MultiLineString': new Style({
    stroke: new Stroke({
      color: 'green',
      width: 1
    })
  }),
  'MultiPoint': new Style({
    image: defaultImage
  }),
  'MultiPolygon': new Style({
    stroke: new Stroke({
      color: 'yellow',
      width: 1
    }),
    fill: new Fill({
      color: 'rgba(255, 255, 0, 0.1)'
    })
  }),
  'Polygon': new Style({
    stroke: new Stroke({
      color: 'blue',
      lineDash: [4],
      width: 2
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 255, 0.1)'
    })
  }),
  'GeometryCollection': new Style({
    stroke: new Stroke({
      color: 'magenta',
      width: 2
    }),
    fill: new Fill({
      color: 'magenta'
    }),
    image: new Circle({
      radius: 10,
      fill: null,
      stroke: new Stroke({
        color: 'magenta'
      })
    })
  }),
  'Circle': new Style({
    stroke: new Stroke({
      color: 'red',
      width: 2
    }),
    fill: new Fill({
      color: 'rgba(255,0,0,0.2)'
    })
  }),
  styleFunction: function(feature) {
    var style;
    var type = feature.getGeometry().getType();

    style = defaultStyles[type];
    // if (style === undefined)    
    return style;
  }
};

// this function takes styles as STRING and creates corrisponding styles OBJECT!
// Note that defaultStyles is already set
var createStyleObjects = function(styles) {

  var stylesObject = {};
  var styleManager = {
    createStyle: {

      Point: function(featureType) {
        var image = new Circle({
          radius: styles.Point.radius,
          fill: styleManager.createFill(featureType),
          stroke: styleManager.createStroke(featureType)
        });
        var pointStyle = new Style({
          image: image
        });
        return pointStyle;
      },

      Polygon: function(featureType) {
        var polygonStyle = new Style({
          stroke: styleManager.createStroke(featureType),
          fill: styleManager.createFill(featureType)
        });
        return polygonStyle;
      },

      /*MultiPoint: function() {
        var image = new Circle({
          radius: styles.MultiPoint.radius,
          fill: new Fill({
            color: styles.MultiPoint.fill.color
          }),
          stroke: new Stroke({
            color: styles.MultiPoint.stroke.color,
            width: styles.MultiPoint.stroke.width
          })
        });
        var multiPointStyle = new Style({
          image: image
        });
        console.log('creating multiPointStyle');
        return multiPointStyle;
      },

      MultiPolygon: function() {
        var multiPolygonStyle = new Style({
          stroke: new Stroke({
            color: styles.MultiPolygon.stroke.color,
            width: styles.MultiPolygon.stroke.width,
            lineDash: [4],
          }),
          fill: new Fill({
            color: styles.MultiPolygon.fill.color
          })
        });
        console.log('creating multiPolygonStyle');
        return multiPolygonStyle;
      },

      LineString: function() {
        var lineStringStyle = new Style({
          stroke: new Stroke({
            color: styles.LineString.stroke.color,
            width: styles.LineString.stroke.width
          })
        });
        console.log('creating LineStringStyle');
        return lineStringStyle;
      },

      MultiLineString: function() {
        var multiLineStringStyle = new Style({
          stroke: new Stroke({
            color: styles.MultiLineString.stroke.color,
            width: styles.MultiLineString.stroke.width
          })
        });
        console.log('creating LineStringStyle');
        return lineStringStyle;
      } */
    },

    // two helper functions to create Strokes and Fills more easily and flexible
    createStroke: function(featureType) {
      if (styles[featureType]['stroke'] == null)
        return null;

      return new Stroke({
        color: styles[featureType].stroke.color,
        width: styles[featureType].stroke.width
      });
    },

    createFill: function(featureType) {
      if (styles[featureType]['fill'] == null)
        return null;

      return new Fill({
        color: styles[featureType].fill.color
      });
    }
  };

  for (var featureType in styles) {
    stylesObject[featureType] = styleManager.createStyle[featureType](featureType);
  }

  return stylesObject;
};

function StyleObject(styles) {
  var thisStyles = createStyleObjects(styles);
  this.styleFunction = function(feature) {
    var style;
    var type = feature.getGeometry().getType();
    try {
      style = thisStyles[type];
      if (style === undefined)
        throw 'style for "' + type + '" features is undefined!';
    } catch (e) {
      console.log(e);
      style = defaultStyles[type];
    }
    return style;
  }
}

var setZoom = function(zoom) {
  map.getView().setZoom(zoom);
};

var setCenter = function(coordinates) {
  map.getView().setCenter(coordinates);
}

var setLayerStyle = function(styles, layerName) {
  var layerCollection = map.getLayers();
  var vectorLayer;
  var layers = [];
  layerCollection.forEach(function(layer, index, array) {
    if (layer.get('DecId') == layerName) {
      layers.push(layer);
    }
  });

  try {
    if (layers.length > 1) {
      throw "there are two layers with the same name!";
    } else if (layers.length == 0) {
      throw "there is no layer with the given name"
    } else {
      vectorLayer = layers[0];
    }
  } catch (err) {
    // this is to hold layers if they are set before layer is added!
    allLayersStyles[layerName] = new StyleObject(styles);
    return;
  }

  var styleObj = new StyleObject(styles);
  vectorLayer.setStyle(styleObj.styleFunction);
};

var addLayer = function(layerName) {
  if (!allLayersStyles[layerName]) {
    allLayersStyles[layerName] = defaultStyles;
  }
  var vectorSource = new ol.source.Vector();
  var vectorLayer = new ol.layer.Vector({
    source: vectorSource,
    style: allLayersStyles[layerName].styleFunction
  });
  vectorLayer.set('DecId', layerName);
  map.addLayer(vectorLayer);
  allLayersNames.push(layerName);
};

var addFeatures = function(featureCollection, layerName) {
  var layerCollection = map.getLayers();
  var vectorLayer;
  var layers = [];
  layerCollection.forEach(function(layer, index, array) {
    if (layer.get('DecId') == layerName) {
      layers.push(layer);
    }
  });

  try {
    if (layers.length > 1) {
      throw "there are two layers with the same name!";
    } else if (layers.length == 0) {
      throw "there is no layer with the given name"
    } else {
      vectorLayer = layers[0];
    }
  } catch (err) {
    console.log(err);
    return;
  }

  var format = new ol.format.GeoJSON();
  var features = format.readFeatures(featureCollection);
  // vectorLayer.setStyle(styleFunctions[layerName]);
  var vectorSource = vectorLayer.getSource();
  vectorSource.addFeatures(features);
};

var onFeatureClicked = function(onClickCallback2) {
  map.on('click', function(evt) {
    var feature = map.forEachFeatureAtPixel(evt.pixel,
      function(feature, layer) {
        if (layer != null && $.inArray(layer.get('DecId'), allLayersNames) != -1) {
          onClickCallback2(feature);
        }
      });
  });
};

var setFeatureStyle = function(feature, style) {

  function createStroke2(featureType) {
    if (style[featureType]['stroke'] == null)
      return null;

    return new Stroke({
      color: style[featureType].stroke.color,
      width: style[featureType].stroke.width
    });
  }

  function createFill2(featureType) {
    if (style[featureType]['fill'] == null)
      return null;

    return new Fill({
      color: style[featureType].fill.color
    });
  }

  try {
    var featureType = feature.getGeometry().getType();
    var stroke = createStroke2(featureType);
    var fill = createFill2(featureType);

    if (featureType == 'Point') {
      var image = new Circle({
        radius: style.Point.radius,
        fill: fill,
        stroke: stroke
      });
      var pointStyle = new Style({
        image: image
      });
      feature.setStyle(pointStyle);

    } else if (featureType == 'Polygon') {
      var polygonStyle = new Style({
        stroke: stroke,
        fill: fill
      });
      feature.setStyle(polygonStyle);
    }

  } catch (err) {
    console.log(err.message);
  }
};

var showPopupForThisFeature = function(feature, title, htmlContent) {
  var popup;
  var overlay;
  var coord;
  var data = feature.getProperties();
  var content = htmlContent || createContent(data);
  var title = title || data.name || '';
  var featureType = feature.getGeometry().getType();
  
  if (featureType == 'Point') {
    coord = feature.getGeometry().getCoordinates();
  } else if (featureType == 'Polygon') {
    coord = feature.getGeometry().getInteriorPoint().getCoordinates();
  }
  
  Viewer.removeOverlays();
  popup = Popup('#o-map');
  overlay = new ol.Overlay({
    element: popup.getEl()
  });
  map.addOverlay(overlay);
  overlay.setPosition(coord);
  popup.setContent({
    content: content,
    title: title
  });
  popup.setVisibility(true);
  Viewer.autoPan();
};

function createContent(data) {
  var content = '<div> <ul>';
  for (var key in data) {
    if (data.hasOwnProperty(key) && key != 'geometry') {
      var line = '<li> <b> ' + key + ': </b> ' + data[key] + ' </li>';
      content += line;
    }
  }
  content += '</ul> </div>';
  return content;
}

export default {
  init,
  setZoom,
  setCenter,
  addLayer,
  addFeatures,
  onFeatureClicked,
  setLayerStyle,
  setFeatureStyle,
  showPopupForThisFeature
}

