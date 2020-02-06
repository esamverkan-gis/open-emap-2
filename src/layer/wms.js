import $ from 'jquery';
import TileWMSSource from 'ol/source/tilewms';
import ImageWMSSource from 'ol/source/imagewms';
import viewer from '../viewer';
import tile from './tile';
import maputils from '../maputils';
import image from './image';
import Modal from '../modal';


function createTileSource(options) {
  return new TileWMSSource(({
    attributions: options.attribution,
    url: options.url,
    gutter: options.gutter,
    crossOrigin: 'anonymous',
    projection: options.projectionCode,
    tileGrid: options.tileGrid,
    params: {
      LAYERS: options.id,
      TILED: true,
      VERSION: options.version,
      FORMAT: options.format,
      STYLES: options.style || ''
    }
  }));
}

function createImageSource(options) {
  return new ImageWMSSource(({
    attributions: options.attribution,
    url: options.url,
    crossOrigin: 'anonymous',
    projection: options.projectionCode,
    params: {
      LAYERS: options.id,
      VERSION: options.version,
      FORMAT: options.format
    }
  }));
}

function reqLoadErrorInformTheUser(layerName, layerTitle) {
  $('#' + layerName).css("background-color", "#ffcccc");
  console.log('layer "' + layerTitle + '" has problem loading tiles!');
  var content = 'Lagret "' + layerTitle + '" kan inte visas för tillfället!';

  Modal.createModal('#o-map', {
    title: 'OBS!',
    content: content
  });

  Modal.showModal();
}

const wms = function wms(layerOptions) {
  const wmsDefault = {
    featureinfoLayer: null
  };
  const sourceDefault = {
    version: '1.1.1',
    gutter: 0,
    format: 'image/png'
  };
  const wmsOptions = $.extend(wmsDefault, layerOptions);
  const renderMode = wmsOptions.renderMode || 'tile';
  wmsOptions.name.split(':').pop();
  const sourceOptions = $.extend(sourceDefault, viewer.getMapSource()[layerOptions.source]);
  sourceOptions.attribution = wmsOptions.attribution;
  sourceOptions.projectionCode = viewer.getProjectionCode();
  sourceOptions.id = wmsOptions.id;
  sourceOptions.format = wmsOptions.format ? wmsOptions.format : sourceOptions.format;
  wmsOptions.serverType = sourceOptions.serverType || 'geoserver';

  const styleSettings = viewer.getStyleSettings()[wmsOptions.styleName];
  const IS_IE11 = !global.ActiveXObject && 'ActiveXObject' in global;
  // This dosen't work in IE, so skip it.
  if (!IS_IE11) {
    const wmsStyleObject = styleSettings ? styleSettings[0].find(s => s.wmsStyle) : undefined;
    sourceOptions.style = wmsStyleObject ? wmsStyleObject.wmsStyle : '';
  }

  if (wmsOptions.tileGrid) {
    sourceOptions.tileGrid = maputils.tileGrid(wmsOptions.tileGrid);
  } else if (sourceOptions.tileGrid) {
    sourceOptions.tileGrid = maputils.tileGrid(sourceOptions.tileGrid);
  } else {
    sourceOptions.tileGrid = viewer.getTileGrid();

    if (wmsOptions.extent) {
      sourceOptions.tileGrid.extent = wmsOptions.extent;
    }
  }

  var layer = null;
  if (renderMode === 'image') {
    layer = image(wmsOptions, createImageSource(sourceOptions));
  }
  let source = createTileSource(sourceOptions);
  // Add listener for failed load requests. If more than 5
  // failures has occurred display a dialog to the user
  var reqLoadErrorHasBeenDisplayedToUser = true;
  var reqLoadErrorCounter = 0;
  source.on('tileloaderror', function (event) {
    reqLoadErrorCounter++;
    if (reqLoadErrorHasBeenDisplayedToUser && reqLoadErrorCounter > 5) {
      reqLoadErrorHasBeenDisplayedToUser = false;
      reqLoadErrorInformTheUser(layerOptions.name, layerOptions.title);
    }
  });

  return tile(wmsOptions, source);
};

export default wms;
