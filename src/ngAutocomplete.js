'use strict';

/**
 * A directive for adding google places autocomplete to a text box
 * google places autocomplete info: https://developers.google.com/maps/documentation/javascript/places
 *
 * Usage:
 *
 * <input type="text"  ng-autocomplete ng-model="autocomplete" options="options" details="details/>
 *
 * + ng-model - autocomplete textbox value
 *
 * + details - more detailed autocomplete result, includes address parts, latlng, etc. (Optional)
 *
 * + options - configuration for the autocomplete (Optional)
 *
 *       + types: type,        String, values can be 'geocode', 'establishment', '(regions)', or '(cities)'
 *       + bounds: bounds,     Google maps LatLngBounds Object, biases results to bounds, but may return results outside these bounds
 *       + country: country    String, ISO 3166-1 Alpha-2 compatible country code. examples; 'ca', 'us', 'gb'
 *       + watchEnter:         Boolean, true; on Enter select top autocomplete result. false(default); enter ends autocomplete
 *
 * example:
 *
 *    options = {
 *        types: '(cities)',
 *        country: 'ca'
 *    }
 **/

var linkFn = function(scope, element, attrs, controller) {
  //options for autocomplete
  var watchEnter = false
  var opts = {}

  //convert options provided to opts
  var initOpts = function(scope) {
    if (scope.options) {

      if (scope.options.watchEnter !== true) {
        watchEnter = false
      } else {
        watchEnter = true
      }

      if (scope.options.types) {
        opts.types = []
        opts.types.push(scope.options.types)
        scope.gPlace.setTypes(opts.types)
      } else {
        scope.gPlace.setTypes([])
      }

      if (scope.options.bounds) {
        opts.bounds = scope.options.bounds
        scope.gPlace.setBounds(opts.bounds)
      } else {
        scope.gPlace.setBounds(null)
      }

      if (scope.options.country) {
        opts.componentRestrictions = {
          country: scope.options.country
        }
        scope.gPlace.setComponentRestrictions(opts.componentRestrictions)
      } else {
        scope.gPlace.setComponentRestrictions(null)
      }
    }
  }

  //function to get retrieve the autocompletes first result using the AutocompleteService 
  var getPlace = function(result) {
    var autocompleteService = new google.maps.places.AutocompleteService();
    if (result.name.length > 0){
      autocompleteService.getPlacePredictions(
        {
          input: result.name,
          offset: result.name.length
        },
        function listentoresult(list, status) {
          if(list == null || list.length == 0) {

            scope.$apply(function() {
              scope.details = null;
            });

          } else {
            var placesService = new google.maps.places.PlacesService(element[0]);
            placesService.getDetails(
              {'reference': list[0].reference},
              function detailsresult(detailsResult, placesServiceStatus) {

                if (placesServiceStatus == google.maps.GeocoderStatus.OK) {
                  scope.$apply(function() {

                    controller.$setViewValue(detailsResult.formatted_address);
                    element.val(detailsResult.formatted_address);

                    scope.details = detailsResult;

                    //on focusout the value reverts, need to set it again.
                    var watchFocusOut = element.on('focusout', function(event) {
                      element.val(detailsResult.formatted_address);
                      element.unbind('focusout')
                    })

                  });
                }
              }
            );
          }
        });
    }
  }


  if (scope.gPlace == undefined) {
    scope.gPlace = new google.maps.places.Autocomplete(element[0], {});
  }

  google.maps.event.addListener(scope.gPlace, 'place_changed', function() {
    var result = scope.gPlace.getPlace();
    if (result !== undefined) {
      if (result.address_components !== undefined) {

        scope.$apply(function() {

          scope.details = result;

          controller.$setViewValue(element.val());
        });
      }
      else {
        if (watchEnter) {
          getPlace(result, scope, element);
        }
      }
    }
  })
  controller.$render = function () {
    var location = controller.$viewValue;
    element.val(location);
  };

  //watch options provided to directive
  scope.watchOptions = function () {
    return scope.options
  };
  scope.$watch(scope.watchOptions, function () {
    initOpts(scope)
  }, true);
}

var TIMEOUT = 5000;        // 5s, 5000ms
var POLL_INTERVAL = 200;   // 200ms
var RETRIES = TIMEOUT / POLL_INTERVAL;   

var waitForGoogle = function(scope, element, attrs, controller, tries) {
  if (tries === undefined || tries === null) {
    tries = 1;
  }

  if (tries >= RETRIES) throw "ngAutocomplete: timed out waiting for google api";

  if (window.google) {
    console.log("ngAutocomplete: google is available");
    linkFn(scope, element, attrs, controller);
  } else {
    console.log("ngAutocomplete: google is NOT available.  Waiting.");
    setTimeout(function() {
      waitForGoogle(scope, element, attrs, controller, tries + 1)
    }, POLL_INTERVAL);
  }
};

angular.module( "ngAutocomplete", [])
  .directive('ngAutocomplete', function() {
    return {
      require: 'ngModel',
      scope: {
        ngModel: '=',
        options: '=?',
        details: '=?'
      },
      link: waitForGoogle
    };
  });
