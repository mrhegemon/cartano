var Deferred = require('deferred-ap');
var Promise = require('promises-ap');
var leaflet = require('leaflet');
var mapbox = require('mapbox');
var $ = require('jquery');
require('leaflet-draw');
require('leaflet-draw-drag');
require('leaflet-markercluster');


/**
 *
 * @param e
 * @private
 */
function _Listener$markerClick(e) {
	if (e.layer instanceof leaflet.Marker) {
		$(e.layer._icon).trigger({
			type: 'marker:click',
			marker: e.layer,
			clustered: false
		});
	}
}


function _getLayerType(layer) {
	if (layer instanceof leaflet.Circle) {
		return 'circle';
	}

	if (layer instanceof leaflet.Marker) {
		return 'marker';
	}

	if (layer instanceof leaflet.Rectangle) {
		return 'rectangle';
	}

	if (layer instanceof leaflet.Polygon) {
		return 'polygon';
	}

	if (layer instanceof leaflet.Polyline) {
		return 'polyline';
	}
}


/**
 *
 * @param event
 * @returns {Array}
 * @private
 */
function _getGeofilters(event) {
	var i, j, coordinates, filters, layer, layers;

	filters = [];
	layers = [];

	if (event.layers) {
		event.layers.eachLayer(function(layer) {
			layers.push(layer);
		});
	}
	else {
		layers.push(event.layer);
	}

	for (i = 0; i < layers.length; i++) {
		coordinates = [];
		layer = layers[i];

		if (layer._latlngs) {
			for (j = 0; j < layer._latlngs.length; j++) {
				coordinates.push({
					lat: layer._latlngs[j].lat,
					lng: layer._latlngs[j].lng
				});
			}
		}
		else if (layer._latlng) {
			coordinates.push({
				lat: layer._latlng.lat,
				lng: layer._latlng.lng
			});
		}

		filters.push({
			id: layer._leaflet_id,
			type: _getLayerType(layer),
			layer: layer,
			element: layer._icon || layer._path,
			coordinates: coordinates
		});
	}

	return filters;
}


/**
 *
 *
 * @param {Number} lat
 * @param {Number} lng
 * @constructor
 */
function Location(lat, lng, estimated) {
	this.lat = lat;
	this.lng = lng;

	this.estimated = estimated === true;
}

Location.prototype = new leaflet.LatLng(0, 0);


/**
 *
 * @constructor
 */
function Map(id, options) {
	var controls, drawStart, drawEnd, element, features, geofilters, layers, map, markers, self = this;

	if (id == null) {
		throw new Error('Mapbox map ID required to instantiate new map.');
	}

	if (!options) {
		options = {};
	}

	if (options.accessToken == null) {
		throw new Error('Mapbox access token required to instantiate new map.');
	}

	controls = {};
	features = {};
	geofilters = {};
	layers = {};

	element = $('<div>').get(0);
	map = mapbox.map(element, id, {
		accessToken: options.accessToken,

		zoomControl: false,

		// FIXME: This was added as a hack to work around a bug in Leaflet's clusterGroup.
		// When reloading the map, at the highest zoom level (19), markers would no longer cluster.
		// This would cause all markers at the same location to stack on top of each other.
		// My solution was to restrict the zoom level to 18, where the bug does not appear.
		// Should revisit if and when ClusterGroup is fixed.
		maxZoom: 18,

		tileLayer: {
			// We want to disable wrapping because there's a "bug" in the Leaflet.draw plugin
			// that prevents a feature from appearing when you wrap the world. E.g. a polygon will
			// appear around Washington, D.C. but if the "globe" is "spun" to Washington, D.C. again,
			// the polygon is gone (however if the globe is spun back, the polygon still exists).
			continuousWorld: false,
			noWrap: true
		},

		// FIXME: There's apparently a bug which prevents you from setting the zoom on init without setting the center. So just use the default center if one isn't specified.
		center: options.center || options.center || new leaflet.LatLng(38.90840148925781, -77.12010192871094),
		zoom: options.zoom || 11
	});

	new leaflet.Control.Attribution({
		position: 'bottomleft',
		prefix: false
	}).addAttribution('&copy; BitScoop Labs, Inc.').addTo(map);

	// Clear the default single marker on the map.
	map.featureLayer.setGeoJSON([]);

	// Create the appropriate feature groups (i.e. "true" layers)
	layers.markers = new leaflet.FeatureGroup().addTo(map);
	layers.path = new leaflet.FeatureGroup();

	// Create the path and add it to the appropriate layer.
	// TODO: Do we want more than one polyline? Can we determine what the threshold is for subdividing the polyline?
	features.path = new leaflet.Polyline([], {
		color: '#000'
	}).addTo(layers.path);

	// Create the cluster group and add it to the appropriate layer.
	markers = features.cluster = new leaflet.MarkerClusterGroup({
		// TODO: A/B test this feature? Could be a little annoying if they're are lots of events close together.
		// disableClusteringAtZoom: 18,
		// TODO: Make this a function of the zoom level. Determine a good form fit.
		//maxClusterRadius: 20,
		spiderfyOnMaxZoom: false,
		showCoverageOnHover: false,
		zoomToBoundsOnClick: false,
		// FIXME: Leaflet.directions CSS will override this setting. Obnoxious.
		spiderLegPolylineOptions: {
			weight: 1.5,
			color: '#222'
		}
	}).addTo(layers.markers);

	// If the layer control option is set to true, add an instantiated control to toggle the path.
	if (options.layerControl === true) {
		controls.layer = new leaflet.Control.Layers(null, {
			Path: layers.path
		}).addTo(map);

		layers.path.addTo(map);
	}

	// If the zoom control option is set to `true` and zoom hasn't been disabled, add an instantiated control to set the
	// zoom level. This zoom control is in addition to the default zooming controlled by the mousewheel and pinches.
	if (options.zoomControl === true && options.disableZoom !== true) {
		controls.zoom = new leaflet.Control.Zoom({
			position: 'topright'
		}).addTo(map);
	}

	// If the draw control option is set to `true`, add an instantiated control to allow creating geofilters on the map.
	if (options.drawControl === true) {
		layers.draw = new leaflet.FeatureGroup().addTo(map);

		controls.draw = new leaflet.Control.Draw({
			position: 'topright',
			edit: {
				featureGroup: layers.draw
			},
			draw: {
				polygon: true,
				polyline: false,
				rectangle: false,
				circle: true,
				marker: false
			}
		}).addTo(map);

		drawStart = function(e) {
			$(element).trigger({
				type: 'drawstart',
				layerType: e.layerType
			});
		};

		drawEnd = function(e) {
			$(element).trigger({
				type: 'drawend',
				layerType: e.layerType
			});
		};

		map.on('draw:drawstart', drawStart);
		map.on('draw:drawstop', drawEnd);
		map.on('draw:editstart', drawStart);
		map.on('draw:editstop', drawEnd);
		map.on('draw:deletestart', drawStart);
		map.on('draw:deletestop', drawEnd);

		// Normalize the elements fired by the Leaflet.draw plugin with event listeners that interpret draw features as
		// geofilters. Intercept the default events and fire a more standard event on the DOM element containing the
		// map. This allows catching the event in other modules/libraries and responding to the events accordingly.
		map.on('draw:created', function(e) {
			var i, filter, filters;

			layers.draw.addLayer(e.layer);

			filters = _getGeofilters(e);

			for (i = 0; i < filters.length; i++) {
				filter = filters[i];
				geofilters[filter.id] = filter;

				$(filter.element).trigger({
					type: 'geofilter:create',
					filter: filter,
					map: self
				});
			}
		});

		map.on('draw:edited', function(e) {
			var i, filter, filters;

			filters = _getGeofilters(e);

			for (i = 0; i < filters.length; i++) {
				filter = filters[i];
				geofilters[filter.id] = filter;

				$(filter.element).trigger({
					type: 'geofilter:update',
					filter: filter,
					map: self
				});
			}
		});

		map.on('draw:deleted', function(e) {
			e.layers.eachLayer(function(layer) {
				var id;

				id = layer._leaflet_id;

				$(element).trigger({
					type: 'geofilter:delete',
					filter: geofilters[id],
					map: self
				});

				delete geofilters[id];
			});
		});

		// TODO: We'll need to add an event handler for when a feature is programmatically added as a geofilter (e.g. on page reload).
		// From initial inspection it looks like there's no obvious way to know what type of feature was added (aside
		// from a large instanceof if-else-if case structure). Furthermore this event will trigger when the draw tool is
		// used to create a filter, so that would lead to catching the user action twice. What should probably be done
		// instead is to add a function like .addGeofilter() to the Map prototype that would fire the appropriate
		// geofilter event on the DOM element.
		/*
		layers.draw.on('layeradd', function(e) {
			console.log(e);
		});
		*/
	}

	if (options.disableZoom === true) {
		map.touchZoom.disable();
		map.doubleClickZoom.disable();
		map.scrollWheelZoom.disable();
	}

	if (options.disablePan === true) {
		map.dragging.disable();
		$(element).css('cursor', 'default');
	}

	if (options.disableTap === true && map.tap) {
		map.tap.disable();
	}

	if (options.className) {
		$(element).addClass(options.className);
	}

	if (options.style) {
		$(element).css(options.style);
	}

	// Bind event listeners to map components.
	layers.markers.on('click', _Listener$markerClick);

	map.on('moveend', function(e) {
		$(element).trigger({
			type: 'map:move',
			map: self
		});
	});

	map.on('zoomend', function(e) {
		$(element).trigger({
			type: 'map:zoom',
			map: self
		});
	});

	markers.on('clusterclick', function(e) {
		var action;

		action = (map.getBoundsZoom(e.layer._bounds) !== e.layer._zoom) ? 'zoom' : 'spiderfy';

		$(e.layer._icon).trigger({
			type: 'marker:click',
			marker: e.layer,
			clustered: true,
			action: action
		});

		// We actually perform the action after firing the event because the triggering element is removed from the DOM.
		// The triggering element shouldn't necessarily be operated on for this reason, but it is necessary to trigger
		// the event on this element to preserve the expected bubbling behavior.
		switch(action) {
			case 'zoom':
				e.layer.zoomToBounds();
				break;
			case 'spiderfy':
				e.layer.spiderfy();
				break;
		}
	});

	// Save properties on the instance.
	this.controls = controls;
	this.element = element;
	this.features = features;
	this.geofilters = geofilters;
	this.layers = layers;
	this.markers = markers;
	this.object = map;
}

Map.prototype = {
	/**
	 *
	 * @returns {Map} Chainable Map instance `this`.
	 */
	clearData: function Map$clearData() {
		this.markers.clearLayers();
		this.features.path.setLatLngs([]);

		return this;
	},

	/**
	 * Adds data to the map.
	 *
	 * @returns {Promise}
	 */
	addData: function Map$addData(data, callback) {
		var i, deferred, marker, markers;

		markers = [];

		for (i = 0; i < data.length; i++) {
			marker = callback(data[i], i);

			markers.push(marker);
		}

		this.markers.addLayers(markers);

		deferred = new Deferred();
		deferred.resolve();

		return deferred.promise;
	},

	/**
	 * Execute a provided callback function on each marker on the map.
	 *
	 * @param {Function} callback
	 */
	eachMarker: function Map$eachMarker(callback) {
		this.markers.eachLayer(callback);
	},

	/**
	 * Sets the size of the map. Can also be used to autofill the map to the parent element's size.
	 *
	 * Does not currently support specified `width` and `height` values.
	 *
	 * @param {Number} [width] The with that the map should be resized to. Null or undefined for autofill width.
	 * @param {Number} [height] The height that the map should be resized to. Null or undefined for autofill height.
	 * @returns {Map} Chainable Map instance `this`.
	 */
	resize: function Map$autosize(width, height) {
		this.object.invalidateSize();

		return this;
	},

	/**
	 * Sets the center position of the map. Constructs a Leaflet.LatLng instance to use as the center if two numbers are
	 * provided, or will use a provided Leaflet.LatLng instance directly if supplied.
	 *
	 * @param {Leaflet.LatLng|Number} lat If a Number, treated as the Latitude of the new center point. If a Leaflet.LatLng, the `lng` argument is ignored and the LatLng instance is used directly.
	 * @param {Number} [lng] If the `lat` argument is a Number, this argument is required and is treated as the Longitude component of the new center point.
	 * @returns {Map} Chainable Map instance `this`.
	 */
	setCenter: function Map$setCenter(lat, lng) {
		var latlng;

		if (lat instanceof leaflet.LatLng) {
			latlng = lat;
		}
		else {
			latlng = new leaflet.LatLng(lat, lng);
		}

		this.object.setView(latlng);

		return this;
	},

	/**
	 * Sets the path polyline with an array of Latitude/Longitude pairings.
	 *
	 * @param {Array} latlngs An array of Leaflet.LatLng instances to set for the path polyline.
	 * @returns {Map} Chainable Map instance `this`.
	 */
	setPath: function Map$setPath(latlngs) {
		// FIXME(?): What happens when you set the path to a LatLng that's technically an event location, but that event is clustered with another?
		// Essentially the path goes to the point where the event "should" be. Should the path be modified on zoom
		// events to instead point to the cluster? Probably... Solving that problem in this module blurs the boundary of
		// how to process data with the callback in .addData(). We'd all of a sudden have to know how to sort by date in
		// this module which doesn't necessarily make sense.
		this.features.path.setLatLngs(latlngs);

		return this;
	},

	/**
	 * Sets the zoom level of the map without animation.
	 *
	 * @param {Number} level An integer zoom factor. Bounds are not validated or coerced, so an error may be thrown if an invalid zoom level is provided.
	 * @returns {Map} Chainable Map instance `this`.
	 */
	setZoom: function Map$setZoom(level) {
		this.object.setZoom(level);

		return this;
	}
};


module.exports = {
	Location: Location,
	Map: Map
};
