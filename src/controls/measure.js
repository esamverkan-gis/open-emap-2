import $ from 'jquery';
import Sphere from 'ol/sphere';
import VectorSource from 'ol/source/vector';
import VectorLayer from 'ol/layer/vector';
import DrawInteraction from 'ol/interaction/draw';
import Overlay from 'ol/overlay';
import Polygon from 'ol/geom/polygon';
import LineString from 'ol/geom/linestring';
import Point from 'ol/geom/point';
import Extent from 'ol/extent';
import viewer from '../viewer';
import utils from '../utils';
import Style from '../style';
import StyleTypes from '../style/styletypes';

const style = Style();
const styleTypes = StyleTypes();

let map;
let activeButton;
let defaultButton;
let measure;
let type;
let sketch;
let measureTooltip;
let measureTooltipElement;
let measureStyleOptions;
let helpTooltip;
let helpTooltipElement;
let vector;
let source;
let label;
let lengthTool;
let areaTool;
let heightTool;
let hightToolUrl;
let defaultTool;
let isActive = false;
let displayLengthAllSegments = false;
const overlayArray = [];

function createStyle(feature) {
  const featureType = feature.getGeometry().getType();
  const measureStyle = featureType === 'LineString' ? style.createStyleRule(measureStyleOptions.linestring) : style.createStyleRule(measureStyleOptions.polygon);

  return measureStyle;
}

function createHelpTooltip() {
  if (helpTooltipElement) {
    helpTooltipElement.parentNode.removeChild(helpTooltipElement);
  }

  helpTooltipElement = document.createElement('div');
  helpTooltipElement.className = 'o-tooltip o-tooltip-measure';

  helpTooltip = new Overlay({
    element: helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left'
  });

  overlayArray.push(helpTooltip);
  map.addOverlay(helpTooltip);
}

function createMeasureTooltip() {
  if (measureTooltipElement) {
    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
  }

  measureTooltipElement = document.createElement('div');
  measureTooltipElement.className = 'o-tooltip o-tooltip-measure';

  measureTooltip = new Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center',
    stopEvent: false
  });

  overlayArray.push(measureTooltip);
  map.addOverlay(measureTooltip);
}

function formatLength(line) {
  const projection = map.getView().getProjection();
  const length = Sphere.getLength(line, {
    projection
  });
  let output = "";

  if (length > 100) {
    output = `${Math.round((length / 1000) * 100) / 100} km`;
  } else {
    output = `${Math.round(length * 100) / 100} m`;
  }

  return output;
}

function formatArea(polygon) {
  const projection = map.getView().getProjection();
  const area = Sphere.getArea(polygon, {
    projection
  });
  let output;

  if (area > 10000000) {
    output = `${Math.round((area / 1000000) * 100) / 100} km<sup>2</sup>`;
  } else if (area > 10000) {
    output = `${Math.round((area / 10000) * 100) / 100} ha`;
  } else {
    output = `${Math.round(area * 100) / 100} m<sup>2</sup>`;
  }

  const htmlElem = document.createElement('span');
  htmlElem.innerHTML = output;

  [].forEach.call(htmlElem.children, (element) => {
    if (element.tagName === 'SUP') {
      element.textContent = String.fromCharCode(element.textContent.charCodeAt(0) + 128);
    }
  });

  return htmlElem.textContent;
}

function toggleMeasure() {
  if (isActive) {
    $('.o-map').trigger({
      type: 'enableInteraction',
      interaction: 'featureInfo'
    });
  } else {
    $('.o-map').trigger({
      type: 'enableInteraction',
      interaction: 'measure'
    });
  }
}

function setActive(state) {
  isActive = state;
}

// Display and move tooltips with pointer
function pointerMoveHandler(evt) {
  if (evt.dragging) {
    return;
  }

  let helpMsg = 'Klicka för att börja mäta';
  if (type == 'Point') {
    helpMsg = 'Klicka för att mäta höjd';
  }
  let tooltipCoord = evt.coordinate;

  if (sketch) {
    const geom = (sketch.getGeometry());
    let output;
    let area;
    let coords;
    label = "";
    if (geom instanceof Polygon) {
      //output = formatArea((geom));
      tooltipCoord = geom.getInteriorPoint().getCoordinates();
      area = formatArea( /** @type {Polygon} */(geom));
      tooltipCoord = geom.getInteriorPoint().getCoordinates();
      coords = geom.getCoordinates()[0];

    } else if (geom instanceof LineString) {
      output = formatLength((geom));
      tooltipCoord = geom.getLastCoordinate();
      coords = geom.getCoordinates();
    } else if (geom instanceof Point) {
      tooltipCoord = geom.getLastCoordinate();
      coords = geom.getCoordinates();
    }
    var totalLength = 0;
    if (!(geom instanceof Point)) {
      totalLength = formatLength(/** @type {LineString} */(geom));
    }
    if (displayLengthAllSegments && !(geom instanceof Point)) {

      var lengthLastSegment = 0;//totalLength;
      var lastSegment;
      if (coords.length >= 1) {
        if (geom instanceof Polygon && coords.length > 2) {
          if (evt.type != "drawend") {
            //if this is a polygon in the progress of being drawn OL creates a extra vertices back to start that we need to ignore
            lastSegment = new LineString([coords[coords.length - 2], coords[coords.length - 3]]);
            let polygonAsLineString = /** @type {LineString} */ (geom);
            let lineStringWithoutLastSegment = new LineString(polygonAsLineString.getCoordinates()[0].slice(0, -1));
            totalLength = formatLength(lineStringWithoutLastSegment);
          }
          else {
            //finish the polygon and put a label on the last verticies as well
            lastSegment = new LineString([coords[coords.length - 1], coords[coords.length - 2]]);
            placeMeasurementLabel(lastSegment, coords);
          }
        }
        else { // Draw segment while drawing is in progress
          lastSegment = new LineString([coords[coords.length - 1], coords[coords.length - 2]]);
        }
        // Create a label for the last drawn vertices and place it in the middle of it.
        lengthLastSegment = formatLength( /** @type {LineString} */(lastSegment));
        if ((evt.type == "click" && evt.type != 'drawend') && coords.length > 2) {
          if (geom instanceof Polygon) {
            var secondToLastSegment = new LineString([coords[coords.length - 3], coords[coords.length - 4]]);
          }
          else {
            var secondToLastSegment = new LineString([coords[coords.length - 2], coords[coords.length - 3]]);
          }
          if (secondToLastSegment) {
            placeMeasurementLabel(secondToLastSegment, coords);
          }
        }
      }
      if (area) {
        output = area + "<br/>";
        label = area + "\n";
      }
      output += lengthLastSegment + " (Totalt:" + totalLength + ")";
      label += totalLength;
    } else {
      output = totalLength;
      label += totalLength;
    }
    measureTooltipElement.innerHTML = output;
    measureTooltip.setPosition(tooltipCoord);
  }

  if (evt.type === 'pointermove') {
    helpTooltipElement.innerHTML = helpMsg;
    helpTooltip.setPosition(evt.coordinate);
  }
}

function addInteraction() {
  vector.setVisible(true);

  measure = new DrawInteraction({
    source,
    type,
    style: style.createStyleRule(measureStyleOptions.interaction)
  });

  map.addInteraction(measure);

  createMeasureTooltip();
  createHelpTooltip();

  map.on('pointermove', pointerMoveHandler);
  map.on('click', pointerMoveHandler);

  measure.on('drawstart', (evt) => {
    // set sketch
    sketch = evt.feature;

    $(helpTooltipElement).addClass('o-hidden');
  }, this);

  measure.on('drawend', (evt) => {
    const feature = evt.feature;
    feature.setStyle(createStyle(feature));
    feature.getStyle()[0].getText().setText(label);
    $(measureTooltipElement).remove();
    pointerMoveHandler(evt);
    // unset sketch
    sketch = null;
    label = '';
    // unset tooltip so that a new one can be created
    measureTooltipElement = null;
    createMeasureTooltip();
    $(helpTooltipElement).removeClass('o-hidden');
    if (feature.getGeometry()  instanceof Point) {
      handleHeight(evt);
    }
  }, this);
}

function onEnableInteraction(e) {
  if (e.interaction === 'measure') {
    $('#o-measure-button button').addClass('o-measure-button-true');
    if (lengthTool) {
      $('#o-measure-line-button').removeClass('o-hidden');
    }
    if (areaTool) {
      $('#o-measure-polygon-button').removeClass('o-hidden');
    }
    if(heightTool){
      $('#o-measure-height-button').removeClass('o-hidden');
    }
    $('#o-measure-button').removeClass('tooltip');
    setActive(true);
    defaultButton.trigger('click');
  } else {
    if (activeButton) {
      activeButton.removeClass('o-measure-button-true');
    }

    $('#o-measure-button button').removeClass('o-measure-button-true');
    if (lengthTool) {
      $('#o-measure-line-button').addClass('o-hidden');
    }
    if (areaTool) {
      $('#o-measure-polygon-button').addClass('o-hidden');
    }
    if (heightTool) {
      $('#o-measure-height-button').addClass('o-hidden');
    }
    $('#o-measure-button').addClass('tooltip');

    map.un('pointermove', pointerMoveHandler);
    map.un('click', pointerMoveHandler);
    map.removeInteraction(measure);
    vector.setVisible(false);
    viewer.removeOverlays(overlayArray);
    vector.getSource().clear();
    setActive(false);
  }
}

function toggleType(button) {
  if (activeButton) {
    activeButton.removeClass('o-measure-button-true');
  }

  button.addClass('o-measure-button-true');
  activeButton = button;
  map.removeInteraction(measure);
  addInteraction();
}

function placeMeasurementLabel(segment, coords) {
  var aa = segment.getExtent();
  var oo = Extent.getCenter(aa);
  var measureElement = document.createElement('div');
  measureElement.className = 'o-tooltip o-tooltip-measure';
  measureElement.id = "measure_" + coords.length;
  var labelOverlay = new Overlay({
    element: measureElement,
    positioning: 'center-center'
  });
  overlayArray.push(labelOverlay);
  labelOverlay.setPosition(oo);
  measureElement.innerHTML = formatLength( /** @type {LineString} */(segment));
  map.addOverlay(labelOverlay);
}

function handleHeight(evt) {

  var feature = evt.feature;
  var coordinate = evt.feature.getGeometry().getCoordinates();
  var heightPromise = fetchHeight(coordinate);
  feature.setStyle(createStyle(feature));
  feature.getStyle()[0].getText().setText('Hämtar höjd...');
  heightPromise.then(function (response) {
    var heightValue = response.geometry.coordinates[2];
    var heightValueShortened = heightValue.toFixed(1);
    feature.getStyle()[0].getText().setText(heightValueShortened + "m");
    source.changed();
    var point = {
      x: coordinate[0],
      y: coordinate[1],
      z: heightValue
    };
  }, function (response) {
    console.log('rejected');
  });
}

function fetchHeight(coordinates) {
  var url1 = hightToolUrl.replace("easting", coordinates[0]);
  var url2 = url1.replace("northing", coordinates[1]);

  //TODO! Trasigt! remove need for proxy!
  //var cors_api_url = 'https://cors-anywhere.herokuapp.com/';

  //if (location.hostname != 'sundsvall.se' && location.hostname != 'www.sundsvall.se') {
    //url2 = cors_api_url + url2;
  //}

  return $.ajax({
    url: url2,
    dataType: 'json'
  });
}

function render(target) {
  if (lengthTool || areaTool) {
    const toolbar = utils.createElement('div', '', {
      id: 'o-measure-toolbar',
      cls: 'o-toolbar-horizontal'
    });

    $(target).append(toolbar);

    const mb = utils.createButton({
      id: 'o-measure-button',
      cls: 'o-measure-button',
      iconCls: 'o-icon-steady-measure',
      src: '#steady-measure',
      tooltipText: 'Mät i kartan'
    });
    $('#o-measure-toolbar').append(mb);
  }

  if (lengthTool) {
    const lb = utils.createButton({
      id: 'o-measure-line-button',
      cls: 'o-measure-type-button',
      iconCls: 'o-icon-minicons-line-vector',
      src: '#minicons-line-vector',
      tooltipText: 'Linje',
      tooltipPlacement: 'north'
    });
    $('#o-measure-toolbar').append(lb);
    $('#o-measure-line-button').addClass('o-hidden');
  }

  if (areaTool) {
    const pb = utils.createButton({
      id: 'o-measure-polygon-button',
      cls: 'o-measure-type-button',
      iconCls: 'o-icon-minicons-square-vector',
      src: '#minicons-square-vector',
      tooltipText: 'Yta',
      tooltipPlacement: 'north'
    });
    $('#o-measure-toolbar').append(pb);
    $('#o-measure-polygon-button').addClass('o-hidden');
  }
  if (heightTool) {
    var hb = utils.createButton({
      id: 'o-measure-height-button',
      cls: 'o-measure-type-button',
      iconCls: 'o-icon-fa-height',
      src: '#fa-arrows-v',
      tooltipPlacement: 'north'
    });
    $('#o-measure-toolbar').append(hb);
    $('#o-measure-height-button').addClass('o-hidden');
  }
}

function bindUIActions() {
  if (lengthTool || areaTool || heightTool) {
    $('#o-measure-button').on('click', (e) => {
      toggleMeasure();
      $('#o-measure-button button').blur();
      e.preventDefault();
    });
  }

  if (lengthTool) {
    $('#o-measure-line-button').on('click', (e) => {
      type = 'LineString';
      toggleType($('#o-measure-line-button button'));
      $('#o-measure-line-button button').blur();
      e.preventDefault();
    });
  }

  if (areaTool) {
    $('#o-measure-polygon-button').on('click', (e) => {
      type = 'Polygon';
      toggleType($('#o-measure-polygon-button button'));
      $('#o-measure-polygon-button button').blur();
      e.preventDefault();
    });
  }
  if (heightTool) {
    $('#o-measure-height-button').on('click', function (e) {
      type = 'Point';
      toggleType($('#o-measure-height-button button'));
      $('#o-measure-height-button button').blur();
      e.preventDefault();
    });
  }
}

function init({
  default: defaultMeasureTool = 'length',
  measureTools = ['length', 'area'],
  target = '#o-toolbar-maptools',
  url = 'https://karta.sundsvall.se/origoserver/lm/elevation/3006/easting/northing',
  optsDisplayLengthAllSegments = false
} = {}) {
  lengthTool = measureTools.indexOf('length') >= 0;
  areaTool = measureTools.indexOf('area') >= 0;
  heightTool = measureTools.indexOf('height') >= 0 ? true : false;
  defaultTool = lengthTool ? defaultMeasureTool : 'area';
  displayLengthAllSegments = true; // optsDisplayLengthAllSegments;
  hightToolUrl = url;

  if (lengthTool || areaTool) {
    map = viewer.getMap();
    source = new VectorSource();
    measureStyleOptions = styleTypes.getStyle('measure');

    // Drawn features
    vector = new VectorLayer({
      source,
      name: 'measure',
      visible: false,
      zIndex: 6
    });

    map.addLayer(vector);

    $('.o-map').on('enableInteraction', onEnableInteraction);

    render(target);
    bindUIActions();
    if (defaultTool === 'area') {
      defaultButton = $('#o-measure-polygon-button button');
    } else if (defaultTool === 'length') {
      defaultButton = $('#o-measure-line-button button');
    }
  }
}

export default { init };
