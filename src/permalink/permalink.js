import permalinkParser from './permalinkparser';
import permalinkStore from './permalinkstore';
import urlparser from '../utils/urlparser';
let saveOnServerServiceEndPoint = "";

export default (() => ({
  getPermalink: function getPermalink(options) {
    let url = "";
    if (options && options.mapStateId) {
      url = permalinkStore.getUrl() + "?mapStateId=" + options.mapStateId;
    }
    else{
      const hash = urlparser.formatUrl(permalinkStore.getState());
      url = `${permalinkStore.getUrl()}#${hash}`;
    }
    return (url);
  },
  parsePermalink: function parsePermalink(url) {
    if (url.indexOf('#') > -1) {
      const urlSearch = url.split('#')[1];
      const urlParts = urlSearch.split('&');
      const urlAsObj = {};
      urlParts.forEach((part) => {
        const key = part.split('=')[0];
        const val = part.split('=')[1];
        if (Object.prototype.hasOwnProperty.call(permalinkParser, key)) {
          urlAsObj[key] = permalinkParser[key](val);
        }
      });
      return urlAsObj;
    }
    return false;
  },
  setSaveOnServerServiceEndpoint: function setSaveOnServerServiceEndPoint (url) {
    saveOnServerServiceEndPoint = url;
  },
  saveStateToServer: function saveStateToServer() {
    return $.ajax({
      type: 'POST',
      url: saveOnServerServiceEndPoint,
      data: JSON.stringify(permalinkStore.getState(true)),
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
    });
  },
  readStateFromServer: function readStateFromServer (mapStateId) {
    if (!mapStateId) {
      throw "No mapStateId";
    }
    if (!saveOnServerServiceEndPoint || saveOnServerServiceEndPoint == "") {
      throw "No saveOnServerServiceEndPoint defined";
    }
    else {
      return $.ajax({
        type: 'GET',
        url: saveOnServerServiceEndPoint + "/" + mapStateId,
        dataType: 'json'
      }).then(function (data) {
        var mapObj = {};
        for (var key in data) {
          mapObj[key] = permalinkParser[key](data[key]);
        }
        return mapObj;
      });
    }
  }
}))();
