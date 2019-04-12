import $ from 'jquery';
import viewer from './src/viewer';
import mapLoader from './src/maploader';
import controlInitialiser from './src/controlinitialiser';
import origoConfig from './conf/origoConfig';
import controls from './conf/origoControls';
import internalApi from './src/internalApi';

const origo = {};
origo.map = {};
origo.config = origoConfig;
origo.controls = controls;
origo.api = internalApi;

function init(config) {
  viewer.init(config.el, config.options);

  // Init controls
  var controllersStateFromPermalink = config.options.params.controls || {}
  controlInitialiser(config.options.controls, controllersStateFromPermalink);
}

origo.map.init = function initMap(options, defaultOptions) {
  const config = defaultOptions ? $.extend(origo.config, defaultOptions) : origo.config;

  const map = mapLoader(options, config);
  if (map) {
    map.then((mapConfig) => {
      init(mapConfig);
    });
    return viewer;
  }
  return null;
};

export default origo;
