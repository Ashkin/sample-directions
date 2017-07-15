'use strict'


var ui = angular.module('ui')

ui.constant('apiConfig', {
  base_url: '/api/v1/directions'
})


ui.service('api', function($http, apiConfig) {

  // Pass CSRF token
  $http.defaults.headers.post['X-CSRF-TOKEN'] = document.querySelector('meta[name="csrf-token"]').content

  class Location {
    constructor() {
      this.address = null
      this.geometry = {
        bounds: {
          northeast: { lat: null, lng: null },
          southwest: { lat: null, lng: null }
        },
        location: { lat: null, lng: null }
      }
    }
  }

  
  this.getLocation = function(address) {
    var url = apiConfig.base_url + '/location'

    return new Promise(function(resolve, reject) {
      $http.post(url, {address: address})
      .then(function(response) {
        // Handle invalid/unknown addresses
        if (response.data.results == null)     return reject('no results')
        if (response.data.results.length == 0) return reject('no results')

        var result = response.data.results[0]

        // Construct location
        var location = new Location()
        location.address           = result.formatted_address
        location.geometry.bounds   = result.geometry.bounds
        location.geometry.location = result.geometry.location

        resolve(location)
      },
      function(err) {
        console.error('(Error)  Unable to fetch results.  Details:', err)
        reject(err.message || err.statusText || 'Unknown error')
      })
    })
  }


  this.getDirections = function(address_from, address_to) {
    return new Promise(function(resolve, reject) {
      $http.post(apiConfig.base_url, {address_from: address_from, address_to: address_to})
      .then(function(response) {
        // As the server returns markup on success or error, simply resolve.
        resolve(response.data)

      }).catch(function(err) {
        console.error('(Error)  Unexpected error:', err)
        reject(err.message || err.statusText || 'Unknown error')
      })
    })
  }


  this.sendEmail = function(email, address_from, address_to) {
    var url = apiConfig.base_url + '/email'

    return new Promise(function(resolve, reject) {
      $http.post(url, {email: email, address_from: address_from, address_to: address_to})
      .then(function(response) {
        resolve()
      }).catch(function(err) {
        if (err.status == 400) return reject('Invalid email address')
        if (err.status == 403) return reject('Incorrect password')
        if (err.status == 500) return reject('Server error.')
        if (err.status == 502) return reject('Bad gateway; please check your connection')

        console.error('(Error)  api::sendEmail(): Unexpected error:', err)
        reject(err.message || 'Error: ' + err.statusText || 'Unknown error')
      })
    })
  }

   return
})
