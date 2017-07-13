
/*
 * var marker = new google.maps.Marker({
 *   position: default_location,
 *   map: window.map
 * })
 *
 */


// show/hide/delete markers via click:
// https://developers.google.com/maps/documentation/javascript/examples/marker-remove



angular.module('ui')
.controller('directionsCtrl', function($scope, $sce, $timeout, api) {

  class Marker {
    constructor(which) {
      this.which     = which  // string   from/to
      this.model     = null   // string   Angular model
      this.address   = null   // string   Real address
      this.not_found = null   // bool     Address not found
      this.object    = null   // object   Google marker object

      this.class = function() {
        return (this.not_found ? 'error' : '')
      }

      this.latlng = function() {
        if (this.object.position == null)
          return []

        return new google.maps.LatLng(this.object.position.lat(), this.object.position.lng())
      }
    }
  }



  // Exposed objects/vars ------------------------

  $scope.markers = {
    from:  new Marker("from"),
    to:    new Marker("to")
  }

  $scope.email = {
    password: '',
    address: '',
    subject: '',
    message: '',
    status: null,
    error: null
  }

  $scope.directions = null
  $scope.display_email_window = false



  // CSS Class getters ------------------------

  $scope.sidebar_class = function() {
    return (!!$scope.directions ? 'visible' : '')
  }



  // Init ------------------------

  ;(function() {
    // Add CSRF Token
    var form = document.getElementById('pdf-form')
    var csrf = document.createElement('input')
    csrf.type = 'hidden'
    csrf.name = 'authenticity_token'
    csrf.value = document.querySelector('meta[name="csrf-token"]').content
    form.appendChild(csrf)

    // Add google maps
    // api.getMap().then(function(script) {
    //   applyMap(script).then(function() {
    //     initMap()
    //   })
    // })

  })()




  // Public ------------------------


  // Trigger update of a marker's address
  $scope.marker_delegate = function(which, event) {
    // Ignore typing
    if (! ["blur", "enter"].includes(event.toLowerCase()))
      return

    update_marker($scope.markers[which]).then(function() {
      //TODO: add timer-based update + debounce

      update_directions()
    })

  }


  $scope.request_pdf = function() {
    if (! directions_exist()) return  // Guard: no directions

    from = document.getElementById("pdf-form-address-from")
    to   = document.getElementById("pdf-form-address-to")

    from.value = $scope.markers.from.address
    to.value   = $scope.markers.to.address
  }

  // Toggle email window
  $scope.show_email = function() {
    $scope.display_email_window = !$scope.display_email_window
  }


  $scope.send_email = function() {
    // Guard: no directions
    if (! directions_exist()) return
    // Simple presence validation
    if ($scope.email.address == '') return $scope.email.error = 'Missing: email address'
    if ($scope.email.subject == '') return $scope.email.error = 'Missing: email subject'

    $scope.email.status = 'sending'
    $scope.email.error = null

    api.sendEmail($scope.email, $scope.markers.from.address, $scope.markers.to.address)
    .then(function() {
      $scope.email.status = 'sent'
    }).catch(function(err) {
      console.error("(Error)  send_mail: caught error:", err)
      $scope.email.status = null
      $scope.email.error = err

      _scope_update()
    })
  }

  $scope.reset_email_form = function() {
    $scope.email.address = ''
    $scope.email.status = null  // will enable [Send] and hide the link.
  }



  // Private ------------------------


  // var applyMap = function(script) {
  //   var tag = document.createElement('script')
  //   tag.src = api.getMapURI()
  // }


  var directions_exist = function() {
    return !!$scope.directions
  }


  // Force an update when changes happen outside of Angular's purview.
  var _scope_update = function() {
    $timeout(function() {
      // (next $digest cycle)
      $scope.$apply()
    })
  }



  // Update the marker's lat/lon and map position
  var update_marker = function(marker) {
    return new Promise(function(resolve, reject) {
      // Skip if nothing's changed
      if (marker.model == marker.address)  return resolve()

      // Delete the marker if its address is empty
      if (marker.model.trim() == '')  return resolve(clear_marker(marker))

      // Otherwise, fetch its position
      resolve_marker_address(marker).then(function(geometry) {
        // update its placement, and update the map
        move_marker(marker, geometry)
        update_map()

        resolve()

      }).catch(function(err) {
        if (err == "no results") {
          marker.not_found = true
          resolve()

          _scope_update()
          return
        }

        console.error("(Error)  Uncaught error:", err)
      })
    })
  }


  var resolve_marker_address = function(marker) {
    return new Promise(function(resolve, reject) {
      api.getLocation(marker.model)
      .then(function(data) {
        // Update active address
        marker.address = marker.model = data.address
        resolve(data.geometry)
      })
      .catch(function(err) {
        reject(err)
      })
    })

  }


  var move_marker = function(marker, geometry) {
    // Clear existing marker
    if (marker.object != null) clear_marker(marker)

    // Place new marker
    marker.object = new google.maps.Marker({
      position: geometry.location,
      map: window.map
    })
  }


  var clear_marker = function(marker) {
    marker.not_found = false    // Clear any error

    if (marker.object == null)  return
    marker.object.setMap(null)  // Remove marker from map
    delete(marker.object)       // and delete it

    _scope_update()
  }


  var update_map = function() {
    var from = $scope.markers.from
    var to   = $scope.markers.to

    window.from = from
    window.to   = to

    // Don't bother if there aren't any markers.
    if (from.object == null  &&  to.object == null)
      return

    var bounds = new google.maps.LatLngBounds()
    if (!!from.object) bounds.extend( from.latlng() )
    if (!!to.object)   bounds.extend(   to.latlng() )

    window.map.fitBounds(bounds)
  }


  var update_directions = function() {
    // Clear directions unless both markers exist
    if (!$scope.markers.from.object  ||  !$scope.markers.to.object) {
      return $scope.directions = null

      _scope_update()
    }

    // Fetch directions
    api.getDirections($scope.markers.from.address, $scope.markers.to.address)
    .then(function(markup) {
      $scope.directions = $sce.trustAsHtml(markup)

      _scope_update()
    })
  }

})
