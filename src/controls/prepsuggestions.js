// this module is slightly different from prepare suggestions and is used for awsomeplete

"use strict";
// this module request data from https://karta.e-tjansteportalen.se and returns an array 
// of suggestions to be shown for the search field

import communeCodes from '../utils/communecodes';
var _ = require('lodash');
/*
  { 
   "NAMN": "Erik vallers väg 12a",
   "GID": 1027, 
   "TYPE": "hallstakartan.tk_s_ads_p", 
   "layer": "Adress", 
   "st_astext": "POINT(134690.511 6610941.918)" 
 }
 */

var makeRequest = function (prepOptions, q) {
  var municipalities = prepMunicipalities(prepOptions.municipalities);
  var limit = prepOptions.limit;
  var url_fastighet = prepOptions.url_fastighet;
  url_fastighet += '&q=' + municipalities + ' ' + encodeURI(q);

  var url_adress = prepOptions.url_adress;
  url_adress += '&q=' + municipalities + ' ' + encodeURI(q);

  var url_ort = prepOptions.url_ort;
  var codes = prepCommuneCodes(prepOptions.municipalities);
  url_ort += '&kommunkod=' + codes + '&q=' + encodeURI(q);

  return Promise.all([
    extractNames(url_fastighet),
    extractAddresses(url_adress, q, limit),
    extractOrter(url_ort, q, limit)
  ])
    .then(function(data) {
      return data;
    })
    .catch(function(err) { 
      throw new Error('Något gick fel, kunde inte hämta data');
    });
}

// Fastigheter
// OBS: response from lm is a list of features here
var extractNames = function (url_fastighet) {

  var dataPromise = $.ajax({
    url: url_fastighet,
    dataType: 'json'
  });

  return dataPromise.then(function(response) {
    // an array that will be populated with substring matches
    // iterate and add the whole object to the 'matches' array plus a dataType identifier

    var matches = [];
    // sometimes server returns an empty object instead of a list. for example if we search "fisk"
    // OBS!  response.constructor.name does not work in IE
    // if (response !== null && response.constructor.name === 'Array') {
    if ( response !== null && Object.prototype.toString.call( response ) === '[object Array]' ) {
      
      matches = response.map(function(obj) {
        return {
          "NAMN": obj.properties.name,
          "id": obj.properties.objid,          
          "TYPE": "hallstakartan.tk_s_ads_p",
          "layer": "Fastighet",
          //this line has no effect bcuz the geometry will be requested later and this won't be used at all
          "st_astext": "POINT(134690.511 6610941.918)",
          "geom_format": "WKT"
        }
      });
      matches.sort(compareFastighet);
    }
    return matches;
  }).fail(function() {
    console.log('Något gick fel, kunde inte hämta Fastigheter.');
  });
};

// Adresser
// OBS: response from lm is a list here:
var extractAddresses = function (url_adress, q, limit) {

  var dataPromise = $.ajax({
    url: url_adress,
    dataType: 'json'
  });

  return dataPromise.then(function (response) {

    // if (response === null || response.constructor.name !== 'Array') {
    if ( response === null || Object.prototype.toString.call( response ) !== '[object Array]' ) {      
      return [];
    }
    
    // an array that will be populated with substring matches
    var preliminaryMatches = [];
    var i = 0;
    // iterate through the pool of strings and populate the object below by different groups based on the street names!
    // in other words all addresses coming from the same street name will be placed in a single group. this gives us a 
    // better possibility of evenly spreading the results.
    var searchResultsBasedOnStreetName = {};
    $.each(response, function (i, arrObj) {
      var str = arrObj[1].split(" ");
      str.pop();
      str.pop();
      str.shift();
      var streetName = str.join(" ");
      if (!searchResultsBasedOnStreetName[streetName]) {
        searchResultsBasedOnStreetName[streetName] = [];
      }
      searchResultsBasedOnStreetName[streetName].push(arrObj);
    });
    // this condition is checked because of the fault in the response from lm.
    // for example for the query 'stor' we get Brunne and Hundsjö in the answer also!!!
    removeErroniousComponents(searchResultsBasedOnStreetName, q);
    do {
      for (var streetName in searchResultsBasedOnStreetName) {
        var nextObj = searchResultsBasedOnStreetName[streetName][i];
        if (nextObj) {
          preliminaryMatches.push(nextObj);
        }
      }
      i++;
    } while (preliminaryMatches.length < limit && i <= preliminaryMatches.length && i < 100);

    // array objects are transformed into standards geojson objects and the pushed to matches array
    var matches = preliminaryMatches.map(function(arrObj) {
      return {
        "NAMN": arrObj[1],
        "TYPE": "hallstakartan.tk_s_ads_p",
        "layer": "Adress",
        "st_astext": "POINT(" + arrObj[2] + " " + arrObj[3] + ")",
        "geom_format": "WKT"
      }
      // geojsonObj.geometry.coordinates[0] = arrObj[2];
      // geojsonObj.geometry.coordinates[1] = arrObj[3];
      // geojsonObj.properties.lastProperty = arrObj[4];
      // geojsonObj.properties.dataType = 'adress';
    });
    matches.sort(compareAddress);
    return matches;
  }).fail(function(err) {
    console.log('Något gick fel, kunde inte hämta Adresser.');
  });
};

// Orter
// OBS: response from lm is a list of geojson objects here:
var extractOrter = function (url_ort, q, limit) {

  var dataPromise = $.ajax({
    url: url_ort,
    dataType: 'json'
  });

  return dataPromise.then(function(response) {

    // if (response === null || response.constructor.name !== 'Array') {
    if ( response === null || Object.prototype.toString.call( response ) !== '[object Array]' ) {      
      return [];
    }

    // regex used to determine if a string contains the substring 'q'
    var substrRegex = new RegExp('^' + q, 'i');
    var substrRegexGeneral = new RegExp(q, 'i');
    // iterate through the pool of strings and for any string that
    // contains the substring 'q', add it to the 'matches' array

    // an array that will be populated with substring matches
    var matches = [];

    response.forEach(function(obj) {
      if (substrRegex.test(obj.properties.name)) {
        matches.push({
          "NAMN": obj.properties.name,
          // "TYPE": "hallstakartan.tk_s_ads_p",
          "layer": "Ort",
          "st_astext": "POINT(" + obj.geometry.coordinates[1] + " " + obj.geometry.coordinates[0] + ")",
          "geometry_format": "WKT"
        });
      }
    });
    if (matches.length < limit) {
      response.forEach(function(obj) {
        if (substrRegexGeneral.test(obj.properties.name)) {
          matches.push(
            {
              "NAMN": obj.properties.name,
              "id": obj.properties.id,
              "TYPE": "hallstakartan.tk_s_ads_p",
              "layer": "Ort",
              "st_astext": "POINT(134690.511 6610941.918)",
              "geometry_format": "WKT"          
            }
          );
        }
      });
    }
    var duplicateFreeMatches = _.uniqBy(matches, function (obj) {
      return obj.id;
    });
    return duplicateFreeMatches;

  }).fail(function() {
    console.log('Något gick fel, kunde inte hämta Orter.');
  });
};


function compareAddress(a, b) {

  var addressString1 = a.NAMN;
  var addressString2 = b.NAMN;

  var str1 = addressString1.split(" ");
  var str2 = addressString2.split(" ");

  str1.pop();
  str2.pop();

  str1.shift();
  str2.shift();

  var streetName1 = str1.join(" ");
  var streetName2 = str2.join(" ");

  if (streetName1 < streetName2)
    return -1;
  if (streetName1 > streetName2)
    return 1;
  return 0;
}

function compareFastighet(a, b) {

  if (a.NAMN < b.NAMN)
    return -1;
  if (a.NAMN > b.NAMN)
    return 1;
  return 0;
}

function removeErroniousComponents(object, q) {

  var q2 = q.split(" ");
  var substrRegex = new RegExp(q2[0], 'i');
  for (var property in object) {
    if (!substrRegex.test(property)) {
      delete object[property];
    }
  }
}

function prepMunicipalities(municipalities) {

  var results = [];
  var municipalitiesTokenized = [];
  if (municipalities)
    municipalitiesTokenized = municipalities.split(",");
  for (var i = 0; i < municipalitiesTokenized.length; i++) {
    results.push(municipalitiesTokenized[i].trim());
  }
  return encodeURI(results.join(","));;
}

function prepCommuneCodes(municipalities) {
  var results = [];
  var municipalitiesTokenized = [];
  if (municipalities)
    municipalitiesTokenized = municipalities.split(",");
  for (var i = 0; i < municipalitiesTokenized.length; i++) {
    results.push(communeCodes.getCommuneCode(municipalitiesTokenized[i].trim()));
  }
  return results.join(",");
}
export default {  
  extractNames,
  extractAddresses,
  extractOrter,
  makeRequest
};
