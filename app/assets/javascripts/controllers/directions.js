
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

  $scope.display_email_window = false
  $scope.directions = {
    markup: null,
    no_route_available: false
  }


  window.directions = $scope.directions


  // Getters ------------------------

  // CSS Classes
  $scope.sidebar_class = function() {
    // Catch `$scope.directions` not being defined yet  (called from markup reference)
    if (!$scope.directions)  return ''

    return (!!$scope.directions.markup ? 'visible' : '')
  }


  // Angular
  $scope.send_button_text = function () {
    if ($scope.email.status == 'sent')    return 'Email Sent'
    if ($scope.email.status == 'sending') return 'Sending...'
    return 'Send!'
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

    var from = document.getElementById("pdf-form-address-from")
    var to   = document.getElementById("pdf-form-address-to")

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

    $scope.email.status = 'sending'  // will disable [send]
    $scope.email.error = null


    // Cleanup
    var email_copy = JSON.parse(JSON.stringify( $scope.email ))
    delete email_copy.status
    delete email_copy.error


    // Send the email!
    api.sendEmail(email_copy, $scope.markers.from.address, $scope.markers.to.address)
    .then(function() {
      $scope.email.status = 'sent'  // will disable [send] and show the [send another email] link.

      _scope_update()
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


  var directions_exist = function() {
    return !!$scope.directions.markup
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
      resolve_marker_address(marker)
      .then(function(geometry) {
        // Clear any existing error, directions, and polylines
        marker.not_found = null
        $scope.directions.markup = null
        clear_polylines()
        // And trigger a view update update next cycle
        _scope_update()

        // update its placement, and update the map
        move_marker(marker, geometry)
        update_map()

        resolve()

      }).catch(function(err) {
        if (err == 'no results') {
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
      $scope.directions.markup = null
      clear_polylines()

      _scope_update()
      return
    }

    // Fetch directions and polylines
    api.getDirections($scope.markers.from.address, $scope.markers.to.address)
    .then(function(directions) {
      $scope.directions.no_route_available = null
      $scope.directions.markup = $sce.trustAsHtml(directions.markup)
      update_polylines(directions.polylines)

      _scope_update()
    }).catch(function(err) {
      if (err == 404) {
        $scope.directions.no_route_available = true
      }
    })
  }


  //TODO: Would be better to move the Polylines functions into their own module.

  // Remove any existing polylines
  var clear_polylines = function() {
    // Guard: polylines[] undefined or empty
    if ($scope.polylines == null)  return
    if ($scope.polylines.length == 0) return

    // Iterate over each polyline and remove it from the map
    $scope.polylines.forEach(function(polyline) {
      polyline.setMap(null)
    })
  }


  // Display new polylines
  var update_polylines = function(polylines) {
    clear_polylines()

    $scope.polylines = []

    polylines.forEach(function(polyline) {
      $scope.polylines.push(
        new google.maps.Polyline({
          strokeColor: '#55aaff',
          strokeOpacity: 1.0,
          strokeWeight: 3,
          path: google.maps.geometry.encoding.decodePath(polyline),  // Decode polyline into Array<LatLng>
          map: window.map
        })
      )

      // window.map.addOverlay(poly)
    })


  }

})
