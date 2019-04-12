import $ from 'jquery';
import modal from '../modal';
import mapmenu from './mapmenu';
import utils from '../utils';
import permalink from '../permalink/permalink';

let shareButton;
let storeMethod = "permalink" //default

function createContent() {
  return '<div class="o-share-link"><input type="text"></div>' +
    '<i>Kopiera och klistra in länken för att dela kartan.</i>';
}

function createLink(options) {
  const url = permalink.getPermalink(options);
  $('.o-share-link input').val(url).select();
}

function bindUIActions() {
  shareButton.on('click', (e) => {
    modal.createModal('#o-map', {
      title: 'Länk till karta',
      content: createContent()
    });
    modal.showModal();
    if (storeMethod == "saveStateToServer") {
      permalink.saveStateToServer().done(function (data) {
        createLink(data);
      });
    }
    else {
      createLink();
    }
    mapmenu.toggleMenu();
    e.preventDefault();
  });
}

function init(options) {
  const el = utils.createListButton({
    id: 'o-share',
    iconCls: 'o-icon-fa-share-square-o',
    src: '#fa-share-square-o',
    text: 'Dela karta'
  });
  if (!options) {
    throw "Options saknas för kontrollern ShareMap";
  }
  if (options.storeMethod) {
    storeMethod = options.storeMethod;
    permalink.setSaveOnServerServiceEndpoint(options.serviceEndpoint);
  }
  $('#o-menutools').append(el);
  shareButton = $('#o-share-button');
  bindUIActions();
}

export default { init };
