'use strict'

google.maps.event.addDomListener(window, 'load', initMap)
function initMap() {
  //TODO: replace this with a geoip lookup
  var default_location = {
    lat: 36.158317285860214,
    lng: -115.15833098441362
  }
  window.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 16,
    center: default_location,
    mapTypeId: 'terrain'
  })
}



// Init ui app
angular.module('ui', [])
angular.element(function() {
  angular.bootstrap(document, ['ui'])
})
