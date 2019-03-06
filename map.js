
	// Global variables to be used throughout program
	var map;
	var polyline;
	var myMarker;
	var tryCount;
	var hash;
	var locating;
	var icons;
	var activeMarkers;
	var markerDragging;
	var showSat;
	var satView;
	var mapView;
	var buildLoc;
	var buildTypes;
	var sidebar;
	var baseURL;
	var noControls;
	
	// @method initMap()
	// Called on page load to initialize variables, set up map, and add controls and markers.
	function initMap()
	{
		if (location.protocol === 'http:')
		{
			location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
		}
		
		map = L.map('map', {
			center: [35.9738346, -78.8982177],
			zoom: 16,
			minZoom: 15,
			zoomControl: false
		});

		map.removeControl(map.attributionControl);
		//map.attributionControl.setPrefix('<a href="https://leafletjs.com/" target="_blank">Leaflet</a>');
		
		mapView = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA', {
			maxZoom: 20,
			attribution: 'Imagery © <a href="https://www.mapbox.com/" target="_blank">Mapbox</a>',
			id: 'mapbox.streets',
		});

		satView = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
			maxZoom: 20,
			attribution: 'Imagery © <a href="https://www.mapbox.com/" target="_blank">Mapbox</a>',
			id: 'mapbox.satellite'
		});
		
		map.addLayer(mapView);
		
		L.Control.View = L.Control.extend({
			options: {
				position: 'bottomright'
			},
			onAdd: function() {
				this.container = L.DomUtil.create('div', 'command');
				this.container.innerHTML = "<button class='map-button' onclick='switchTileLayer();'><img class='map-button-img' id='changeView' src='images/earth.svg'></button>";
				return this.container;
			}
		});
		L.control.view = function() { return new L.Control.View(); };
		
		L.Control.Locate = L.Control.extend({
			options: {
				position: 'topright'
			},
			onAdd: function() {
				this.container = L.DomUtil.create('div', 'command');
				this.container.innerHTML = "<button class='map-button' onclick='attemptLocate();'><img class='map-button-img' id='locateButton' src='images/locate.svg'></button>";
				return this.container;
			}
		});
		L.control.locate = function() { return new L.Control.Locate(); };
		
		sidebar = L.control.sidebar("sidebar", {openOnAdd: !L.Browser.mobile, showHeader: true, showFooter: true, fullHeight: true, headerHeight: 12, footerHeight: 8}).addTo(map);
		var viewchange = L.control.view().addTo(map);
		var locater = L.control.locate().addTo(map);
		
		sidebar.on('open', function() {
			if(L.Browser.mobile)
			{
				setTimeout(function() {
					map.removeControl(locater);
					map.removeControl(viewchange);
				}, 200);
			}
		});
		
		sidebar.on('close', function() {
			if(L.Browser.mobile)
			{
				setTimeout(function() {
					locater.addTo(map);
					viewchange.addTo(map);
				}, 200);
			}
		});

		L.DomEvent.disableClickPropagation(document.getElementById("locateButton"));
		L.DomEvent.disableClickPropagation(document.getElementById("changeView"));
				
		map.on('locationfound', onLocationFound);
		map.on('locationerror', locationError);
		
		activeMarkers = [];
		buildTypes = new Set();
		
		for(var i = 0; i < features.length; i++)
		{
			buildTypes.add(features[i][2]);
		}
		
		icons = {
			parking: 'images/parking-ico.svg',
			admin: 'images/admin-ico.svg',
			interest: 'images/interest-ico.svg',
			dorm: 'images/dorm-ico.svg',
			classroom: 'images/classroom-ico.svg',
			food: 'images/food-ico.svg',
			printer: 'images/printer-ico.svg',
			bathroom: 'images/bathroom-ico.svg',
			recreation: 'images/recreation-ico.svg',
			library: 'images/library-ico.svg',
			service: 'images/service-ico.svg'
		};
		
		var urlAddress = window.location.href.trim();
		var tagsArray = urlAddress.slice( urlAddress.indexOf("?") + 1 ).split("&");
		
		if(urlAddress.indexOf('?') > -1)
		{
			baseURL = urlAddress.substring(0, urlAddress.indexOf('?'));
		}
		else
		{
			baseURL = urlAddress;
		}
		
		noControls = false;
		
		if(urlAddress.indexOf("ctrl=false") > -1)
		{
			noControls = true;
			map.removeControl(sidebar);
			map.removeControl(viewchange);
			map.removeControl(locater);
		}
		
		if(!noControls)
		{
			fillContent();
		}
		
		for(var i = 0; i < tagsArray.length; i++)
		{
			var tag = tagsArray[i].toLowerCase().split("=");
			
			switch (tag[0]) 
			{
				case "type": 
					if (buildTypes.has(tag[1]))
					{
						addType(tag[1]);
					}
					break;
				case "bldg": 
					if (tag[1] >= 0 && tag[1] <= features.length) 
					{
						if((urlAddress.match(/bldg/g) || []).length === 1)
							addMarker(tag[1], true);
						else
							addMarker(tag[1], false);
					}
					break;
			}	
		}
		
		if(noControls)
		{
			return;
		}

		tryCount = 0;
		buildLoc = -1;
		showSat = false;
		locating = false;
		markerDragging = false;
		initHash();
		
		document.getElementById("textField").onkeypress = function(e) {
			var keyCode = e.keyCode || e.which;
			
			if(keyCode === 13)
			{
				if(document.getElementById("suggestions").firstChild)
				{
					document.getElementById("suggestions").children[0].click();
					clearSearch();
				}
			}
		};
	}
	
	function clearSearch()
	{
		document.getElementById("textField").value="";
		hashText("textField", "suggestions", 5, null);
	}
	
	function fillContent()
	{
		for(var i = 0; i < features.length; i++)
		{
			var divID = features[i][2] + "-section";
			var tableID = features[i][2] + "-list";

			if(!document.body.contains(document.getElementById(divID)))
			{
				var section = L.DomUtil.create('div', 'section');
				section.id = divID;
				
				var sectionHeader = L.DomUtil.create('div', 'section-header');
				sectionHeader.id = features[i][2] + "-temp";
				
				sectionHeader.onclick = function(e) 
				{
					if(e.target.id.indexOf("check") == -1)
					{
						//Expand or collapse this panel
						$(this).next().slideToggle('fast');
						
						//Hide the other panels
						$(".section-list").not($(this).next()).slideUp('fast');
					}
				};
				
				var sectionTitle = L.DomUtil.create('span', 'section-title');
				sectionTitle.innerHTML = "<p><img class='section-image' src='images/" + features[i][2] + "C-ico.svg'/>" + (features[i][2].charAt(0).toUpperCase() + features[i][2].slice(1)) + "</p>";
				
				var sectionCheck = L.DomUtil.create('input', 'section-check');
				sectionCheck.type = "checkbox";
				sectionCheck.openType = features[i][2];
				sectionCheck.id = features[i][2] + "-check";
				
				sectionCheck.onclick = function() 
				{
					checkedLocation(this.openType);
				};
				
				sectionHeader.appendChild(sectionTitle);
				sectionHeader.appendChild(sectionCheck);
				
				var tablediv = L.DomUtil.create('div', 'section-list');
				tablediv.id = tableID;
				tablediv.innerHTML = "";

				section.appendChild(sectionHeader);
				section.appendChild(tablediv);
				document.getElementById("location-list").appendChild(section);
			}
			
			document.getElementById(tableID).innerHTML +=  "<div class='section-location' onclick='openMarker(" + i + ");'>" + features[i][3] + "</div>";
		}
	}
	
	function clearList()
	{
		buildTypes.forEach(function(type) {
			var name = type + "-check";
			
			if(document.getElementById(name).checked)
			{
				document.getElementById(name).checked = false;
				checkedLocation(type);
			}
		});
		
		for(var i = 0; i < activeMarkers.length; i++)
		{
			map.removeLayer(activeMarkers[i]);
		}
		activeMarkers = [];
		
		cleanMap();
	}
	
	function checkedLocation(type)
	{
		var name = type + "-check";
		if(document.getElementById(name).checked)
		{
			addType(type);
		}
		else
		{
			for(var i = 0; i < activeMarkers.length; i++)
			{
				if(activeMarkers[i].mType === type)
				{
					map.removeLayer(activeMarkers[i]);
				}
			}
			
			activeMarkers = activeMarkers.filter(function(marker) {
				return marker.mType !== type;
			});
		}
	}

	function openMarker(index)
	{
		for(var i = 0; i < activeMarkers.length; i++)
		{
			if(activeMarkers[i].index === index)
			{
				activeMarkers[i].fire('click');
				return;
			}
		}
		addMarker(index, features[index][2], true);
	}

	function addMarker(index, openUp)
	{
		for(var i = 0; i < activeMarkers.length; i++)
		{
			if(activeMarkers[i].index === index)
			{
				return;
			}
		}
		
		var feature = features[index];
		var marker = L.marker([feature[0], feature[1]], {zIndexOffset: 0, interactive: true, icon: L.icon({iconUrl: icons[feature[2]], iconSize: [26, 30], iconAnchor: [10, 10], popupAnchor: [10, -10]})});
		marker.mType = feature[2];
		marker.index = index;

		marker.bindPopup(feature[3]);

		if(noControls === false)
		{
			marker.on('click', function() {
				cleanMap();
				sidebar.showLayer(1);

				populateLocation(index);
					
				marker.closePopup();
				sidebar.open();
				map.setView(marker.getLatLng(), 18);
			});
		}
		
		marker.on('mouseover', function() {
			if(!markerDragging)
			{
				var icon = marker.options.icon;
				marker.options.zIndexOffset = 100;
				icon.options.iconSize = [40, 40];
				marker.setIcon(icon);
				marker.openPopup();
			}
		});
			
		marker.on('mouseout', function() {
			if(!markerDragging) 
			{
				var icon = marker.options.icon;
				marker.options.zIndexOffset = 0;
				icon.options.iconSize = [26, 30];
				marker.setIcon(icon);
				marker.closePopup();
			}
		});
		
		marker.addTo(map);
		activeMarkers.push(marker);

		if(openUp)
		{
			setTimeout(function() {
				marker.fireEvent('click');
				map.setView(marker.getLatLng(), 18);
			}, 300);
		}
	}
	
	function populateLocation(index)
	{
		var feature = features[index];
		
		document.getElementById("location-content").innerHTML = "";
	
		document.getElementById("location-title").innerHTML = feature[3];
		
		document.getElementById("image-block").removeChild(document.getElementById("image-block").firstChild);
	
		var locationImage = L.DomUtil.create('img');
		locationImage.id = 'location-image';
		locationImage.alt = feature[3];
	
		var imageURL = "locations/" + feature[3].toLowerCase().split('.').join('').split(' ').join('-').replace(' ', '-') + ".jpg";
		locationImage.src = (feature[2] === 'parking' || feature[2] === 'printer' || feature[2] === 'bathroom') ? "locations/default-img.jpg" : imageURL;
		locationImage.onerror = function() {
			locationImage.src = "locations/default-img.jpg";
		};
	
		document.getElementById("image-block").appendChild(locationImage);
	
		if(feature.length > 4)
		{
			for(var i = 0; i < feature[4].length; i++)
			{
				var detail = "";
				switch(feature[4][i][0])
				{
					case 'inside':
						detail = "Inside this location";
						break;
					case 'website':
						detail = "Website(s) for this location";
						break;
					case 'phone':
						detail = "Phone number for this location";
						break;
					case 'parktype':
						detail = "The parking permits that can park here";
						break;
					case 'accessible':
						detail = "The number of handicap-accessible spots";
						break;
					case 'bathroom':
						detail = "The unisex bathroom can be found here";
						break;
					case 'printloc':
						detail = "The printer can be found here";
						break;
				}
			
				document.getElementById("location-content").innerHTML += detail + "<br>";
				for(var j = 1; j < feature[4][i].length; j++)
				{
					document.getElementById("location-content").innerHTML += "<div class='location-detail'><img class='detail-image' src='images/" + feature[4][i][0] + "-ico.svg'></img> " + feature[4][i][j] + "</div>";					
				}
				document.getElementById('location-content').innerHTML += "<br>";
			}
		}
			
		document.getElementById("share-location").onclick = function() {
			shareLocation(index);
		};
		
		document.getElementById("directions-button").onclick = function() {
			populateDirections(index);
		};
	}
	
	function populateDirections(index)
	{
		sidebar.showLayer(2);
		
		document.getElementById("direction-title").innerHTML = features[index][3];
		
		document.getElementById('directions-info').innerHTML = "";
		
		document.getElementById("directions-time").innerHTML = "";
		
		document.getElementById("direction-location").onclick = function() {
			document.getElementById("location-option").checked = true;
		};
		
		document.getElementById("direction-building").onclick = function() {
			document.getElementById("building-option").checked = true;
		};

		L.DomUtil.removeClass(document.getElementById('directions-info'), 'directions-open');

		document.getElementById("direction-button").onclick = function() {
			getDirections(index);
		};
	}
	
	function shareLocation(index)
	{
		sidebar.showLayer(3);
		
		var shareURL = baseURL + "?bldg=" + index.toString();
		
		document.getElementById("link-title").innerHTML = features[index][3];
		
		document.getElementById("location-url").value = shareURL;
		
		var embedText = "<iframe width='400' height='400' src='" + shareURL + "&ctrl=false'/>";
		
		document.getElementById("location-embed").value = embedText;
	}
	
	function shareMap()
	{
		var shareURL = baseURL;
		var activeTypes = new Set();
		var tags = [];
		
		buildTypes.forEach(function(type) {
			var checkID = type + "-check";
			if(document.getElementById(checkID).checked)
			{
				tags.push("type=" + type);
				activeTypes.add(type);
			}
		});
		
		activeMarkers.forEach(function(marker) {
			if(!activeTypes.has(marker.mType))
			{
				tags.push("bldg=" + marker.index.toString());
			}
		});
		
		if(tags.length > 0)
		{
			shareURL += "?";
			for(var i = 0; i < tags.length; i++)
			{
				if(i > 0)
				{
					shareURL += "&";
				}
				shareURL += tags[i];
			}			
		}
		
		sidebar.showLayer(4);
		
		document.getElementById("map-url").value = shareURL;
		
		var embedText = "<iframe width='400' height='400' src='" + shareURL + ((shareURL.charAt(shareURL.length - 1) === 'l') ? "?ctrl=false" : "&ctrl=false") + "'/>";
		
		document.getElementById("map-embed").value = embedText;
	}

	function addType(type)
	{
		for(var i = 0; i < features.length; i++)
		{
			if(features[i][2] === type)
			{
				addMarker(i, false);
			}
		}
		
		if(sidebar.getCurrentIndex() === 0)
		{
			document.getElementById(type + "-check").checked = true;
		}
	}
	
	function copyToClipboard(id)
	{
		var copyElement = document.getElementById(id);
		
		if(L.Browser.ie)
		{
			window.clipboardData.setData('Text', copyElement.value);
		}
		else
		{
			copyElement.select();
			
			document.execCommand("copy");
		}
	}
	
	// @method switchTileLayer()
	// Changes map view between plain map and satellite
	function switchTileLayer()
	{
		if(!showSat)
		{
			document.getElementById("changeView").src = "images/map.svg";
			map.removeLayer(mapView);
			map.addLayer(satView);
			showSat = true;
			
			if(polyline !== undefined)
			{
				polyline.setStyle({color: '#d9d900'});
			}
		}
		else
		{
			document.getElementById("changeView").src = "images/earth.svg";
			map.removeLayer(satView);
			map.addLayer(mapView);
			showSat = false;

			if(polyline !== undefined)
			{
				polyline.setStyle({color: '#005ef7'});
			}
		}
	}
	
	// @method attemptLocate()
	// Acts as binary lock on locating user
	function attemptLocate()
	{
		if(locating)
		{
			return;
		}
		
		locating = true;
		document.getElementById("locateButton").src = "images/spinner.svg";
		
		map.locate({maximumAge: 0, enableHighAccuracy: true});
	}
	
	// @method locationError(<ErrorEvent {code}> err)
	// Handles errors caused by location tracking either failing or location not being acceptable.
	// Error code legend -> 1: Location denied,	2: Position Unobtainable, 3: Location timeout, 4: Low accuracy, 5: Location not within bounds, 6: Need to continue dragging
	function locationError(err)
	{
		var message = "";
				
		switch(err.code)
		{
			case 1: tryCount = 2;
				message = "Please turn on location and allow the app to use your location.";
				break;
			case 2: message = "The location service failed.";
				break;
			case 3: message = "The location service timed out.";
				break;
			case 4: message = "The location accuracy is too low.";
				break;
			case 5: message = "Your location is not within NCCU bounds.";
				break;
		}
		message += " Click \"Continue\" to drag a marker to your location or click \"Cancel\" to cancel.";
		
		if(tryCount >= 2)
		{
			errorPopup(message, failedLocation);
			return;
		}
		tryCount++;
		map.locate({maximumAge: 0, enableHighAccuracy: true, timeout: 5000});
	}
	
	// @method failedLocation()
	// Adds marker to center of campus and allows user to drag marker to location
	function failedLocation()
	{
		if(polyline !== undefined)
		{
			map.removeLayer(polyline);
		}

		if(myMarker !== undefined)
		{
			map.removeLayer(myMarker);
		}
		
		myMarker = L.marker([35.9738346, -78.8982177], {zIndexOffset: 1000, icon: L.icon({iconUrl: 'images/location-ico.svg', iconSize: [32, 36], iconAnchor: [10, 10], popupAnchor: [0, -18]})}).addTo(map);

		myMarker.on('dragstart', function() {
			markerDragging = true;
		});
		
		myMarker.on('dragend', function() {
			markerDragging = false;
		});
				
		myMarker.dragging.enable();
		tryCount = 0;
		
		setTimeout(function() { map.setView(myMarker.getLatLng(), 17); }, 300);
				
		setTimeout(function() { setLocation(myMarker.getLatLng());}, 10000 );
	}
	
	function onLocationFound(position) 
	{
		if(position.accuracy > 100)
		{
			locationError({code: 4});
			return;
		}
		else if((position.latlng.lat <= 35.9683968 || position.latlng.lat >= 35.977236) || (position.latlng.lng >= -78.8923467 || position.latlng.lng <= -78.9084195))
		{
			locationError({code: 5});
			return;
		}
		
		setLocation(position.latlng);
	}
	
	function setLocation(position)
	{
		if(myMarker !== undefined)
		{
			map.removeLayer(myMarker);	
		}
		
		myMarker = L.marker(position, {zIndexOffset: 1000, icon: L.icon({iconUrl: 'images/location-ico.svg', iconSize: [32, 36], iconAnchor: [10, 10], popupAnchor: [0, -18]})}).addTo(map);
		
		map.setView(position, 18);
		setTimeout(function() {verifyLocation();}, 500);
	}
	
	function errorPopup(message, callback)
	{
		document.getElementById("errorMsg").innerHTML = message;
		$(function() {
			$( "#error-message" ).dialog({
				dialogClass: "no-close",
				resizable: false,
				draggable: false,
				modal: false,
				buttons: {
					"Continue": function() {
						$(this).dialog("close");
						callback();
					},
					"Cancel": function() {
						$(this).dialog("close");
						document.getElementById("locateButton").src = "images/locate.svg";
						locating = false;
					}
				}
			});
			$( "#error-message" ).dialog("moveToTop");
		});
	}
	
	// @method verifyLocation()
	// Allows user to confirm marker location as accurate or correct if wrong.
	function verifyLocation()
	{
		$(function() {
			$( "#confirm-location" ).dialog({
				dialogClass: "no-close",
				resizable: false,
				draggable: false,
				modal: false,
				buttons: {
					"Yes": function() {
						$( this ).dialog( "close" );
						document.getElementById("locateButton").src = "images/locate.svg";
						myMarker.dragging.disable();
						locating = false;
					},
					"No":  function() {
						$( this ).dialog( "close" );
						myMarker.dragging.enable();	
						setTimeout(function() {setLocation(myMarker.getLatLng());}, 10000);
					}
				}
			});
			$( "#confirm-location" ).dialog("moveToTop");
		});
	}
	
	// @method findBuilding(<Number> index)
	// Fills direction textbox when building suggestion was clicked.
	function findBuilding(index)
	{
		document.getElementById("locations").innerHTML = "";
		document.getElementById("locationBox").value = features[index][3];
		buildLoc = index;
		return;
	}
	
	// @method cleanMap()
	// Closes any popups as well as removes route lines
	function cleanMap()
	{
		map.closePopup();
		
		if(polyline !== undefined)
		{
			map.removeLayer(polyline);
		}
	}
	
	function degreesToRadians(degrees) 
	{
		return degrees * Math.PI / 180;
	}
	
	function getDistance(pos1, pos2)
	{
		var earthRadiusFeet = 6371 * 1000 * 3.28084;

		var dLat = degreesToRadians(pos2[0]-pos1[0]);
		var dLon = degreesToRadians(pos2[1]-pos1[1]);

		var tlat1 = degreesToRadians(pos1[0]);
		var tlat2 = degreesToRadians(pos2[0]);
		var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(tlat1) * Math.cos(tlat2); 
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		
		return earthRadiusFeet * c;
	}
	
	function findAngle(a, b, c)
	{
		var ab = [ b[0] - a[0], b[1] - a[1] ];
		var cb = [ b[0] - c[0], b[1] - c[1] ];

        var dot = (ab[0] * cb[0] + ab[1] * cb[1]);
        var cross = (ab[0] * cb[1] - ab[1] * cb[0]);

        var alpha = -Math.atan2(cross, dot);
        if (alpha < 0) alpha += 2 * Math.PI;
		
		alpha = (alpha * 180) / Math.PI;
        return alpha;
	}
	
	// @method getDirections(<Number> end_index)
	// Draws a polyline along route after finding best path using Dijkstra's shortest path algorithm.
	function getDirections(end_index)
	{
		var canAccess = !document.getElementById("accessBox").checked;
		var start_index = 0;
		var start_name = "";
		var end_name = features[end_index][3];
		
		document.getElementById("directions-time").innerHTML = "";
		document.getElementById('directions-info').innerHTML = "";
		
		if(document.getElementById("location-option").checked)
		{
			if(myMarker === undefined)
			{
				document.getElementById("directions-time").innerHTML = "Please find your location first.";
				return;
			}
			
			start_name = "Your location";
			
			var distance = Number.MAX_VALUE;
			
			var markerLocation = [myMarker.getLatLng().lat, myMarker.getLatLng().lng];
			
			for(var i = 0; i < sidewalks.length; i++)
			{
				var newdist = getDistance(markerLocation, sidewalks[i]);
			
				if(newdist < distance)
				{
					distance = newdist;
					start_index = i;
				}
			}
		}
		else if(document.getElementById("building-option").checked)
		{
			if(buildLoc === -1)
			{
				document.getElementById("directions-time").innerHTML = "Please enter a location first.";
				return;	
			}
			
			if(buildLoc === end_index)
			{
				document.getElementById("directions-time").innerHTML = "These are the same locations.";
				return;	
			}
			
			addMarker(buildLoc, false);
			
			start_name = features[buildLoc][3];
			
			var smallestDistance = Number.MAX_VALUE;
			var minIndex = 0;
			
			for(var i = 0; i < connections.length; i++)
			{
				if(connections[i][1] === buildLoc)
				{
					if(connections[i][2] || canAccess)
					{
						var newdist = getDistance(sidewalks[connections[i][0]], features[end_index]);
						
						if(newdist < smallestDistance)
						{
							smallestDistance = newdist;
							minIndex = connections[i][0];
						}
					}
				}
			}
			
			start_index = minIndex;
		}
		else
		{
			return;
		}
		
		var numNodes = sidewalks.length;
		var largeNum = Number.MAX_VALUE;

		var myMap = new Map();
		var visitedNodes = new Array(numNodes);
		var nodeWeights = new Array(numNodes);
		var prevNodes = new Array(numNodes);

		for (var i = 0; i < numNodes; i++)
		{
			myMap.set(i, []);
			visitedNodes[i] = false;
			prevNodes[i] = -1;
			nodeWeights[i] = largeNum;
		}
		
		for(var i = 0; i < edges.length; i++)
		{
			myMap.get(edges[i][0]).push([edges[i][1], edges[i][3], edges[i][2]]);
			myMap.get(edges[i][1]).push([edges[i][0], edges[i][3], edges[i][2]]);
		}
		
		visitedNodes[start_index] = true;
		nodeWeights[start_index] = 0;

		var currentNode = start_index;
		
		loop:
		while (true)
		{
			for(var i = 0; i < connections.length; i++)
			{
				if(connections[i][1] === end_index && connections[i][0] === currentNode)
				{		
					if(connections[i][2] || canAccess)
					{
						break loop;
					}
				}
			}
			
			var len = myMap.get(currentNode).length;

			for (var i = 0; i < len; i++) 
			{
				var newEdge = myMap.get(currentNode)[i];
				
				if(newEdge[2] || canAccess)
				{
					if (nodeWeights[currentNode] + newEdge[1] < nodeWeights[newEdge[0]] )
					{
						nodeWeights[newEdge[0]] = nodeWeights[currentNode] + newEdge[1];
						prevNodes[newEdge[0]] = currentNode;
					}
				}
			}

			var minIndex = -1;
			var minDist = largeNum;

			for (var i = 0; i < numNodes; i++) 
			{
				if (visitedNodes[i] === false && nodeWeights[i] < minDist) 
				{
					minIndex = i;
					minDist = nodeWeights[i];
				}
			}
			
			if(minIndex === -1)
			{
				alert("No possible route");
				return;
			}
			
			currentNode = minIndex;
			visitedNodes[minIndex] = true;
		}
		
		sidebar.showLayer(2);
		if(polyline !== undefined)
		{
			map.removeLayer(polyline);
		}
		
		var index = currentNode;
		var latlngs = [[sidewalks[currentNode][0], sidewalks[currentNode][1]]];
		
		while (index !== start_index) 
		{			
			index = prevNodes[index];
			latlngs.push([sidewalks[index][0], sidewalks[index][1]]);
		}
		
		if(latlngs.length === 1)
		{
			document.getElementById("directions-time").innerHTML = "These are the same locations.";
			return;	
		}
		
		var minutes = Math.ceil(nodeWeights[currentNode] / 60);
		document.getElementById("directions-time").innerHTML = "Estimated time: " + minutes.toString() + " minutes.";
		
		L.DomUtil.addClass(document.getElementById('directions-info'), 'directions-open');
		document.getElementById('directions-info').innerHTML = "<div class='direction-row top-direction-row'><b>Start</b><b>" + start_name + "</b></div>";
		
		for(var i = latlngs.length - 1; i > 1; i--)
		{			
			var distance = getDistance(latlngs[i], latlngs[i - 1]);
			
			var angle = findAngle(latlngs[i], latlngs[i - 1], latlngs[i - 2]);
			
			var turn = "";
			var imageURL = "";

			if(angle > 170 && angle < 190)
			{
				turn = "go straight";
				imageURL = "images/straight.svg";
			}
			else if(angle <= 170 && angle > 135)
			{
				turn = "veer right";
				imageURL = "images/veer-right.svg";
			}
			else if(angle >= 190 && angle < 225)
			{
				turn = "veer left";
				imageURL = "images/veer-left.svg";
			}
			else if(angle <= 150)
			{
				turn = "turn right";
				imageURL = "images/right-turn.svg";
			}
			else
			{
				turn = "turn left";
				imageURL = "images/left-turn.svg";
			}
			
			distance = Math.round(distance);

			document.getElementById('directions-info').innerHTML += "<div class='direction-row'><img class='direction-image' src='" + imageURL + "'/>In " + distance + " feet, " + turn + "</div>";
		}
		document.getElementById('directions-info').innerHTML += "<div class='direction-row'><b>End</b><b>" + end_name + "</b></div>";
		
		polyline = L.polyline(latlngs, {color: '#005ef7', interactive: false, weight: 5, opacity: 1});
		
		if(showSat)
		{
			polyline = L.polyline(latlngs, {color: '#d9d900', interactive: false, weight: 5, opacity: 1});
		}
		
		if(L.Browser.mobile)
		{
			sidebar.close();
		}
		
		map.addLayer(polyline);
		
		/*
		setTimeout(function() {
			map.fitBounds(polyline.getBounds());
		}, 400);
		*/
	}
	
	// @method hashStr(String str): <Number> hashed
	// Given a string, return a hash value based on Rabin-Karp algorithm.
	function hashStr(str)
	{
		var hashed = 0;
		
		for(var i = 0; i < str.length; i++)
		{
			hashed += (str[i].charCodeAt(0) * Math.pow(101, i)) % 2847731;
		}
		
		return hashed;
	}
	
	// @method initHash()
	// Fill up hash table with all partial hashes of each location name.
	function initHash()
	{
		hash = {};
		
		for(var i = 0; i < features.length; i++)
		{
			var str = features[i][3];
			var str_lower = str.toLowerCase();
			str_lower = str_lower.replace("'", "");
			
			for(var j = 0; j < str.length - 1; j++)
			{
				for(var k = j + 1; k <= str.length; k++)
				{
					var partial = str_lower.substring(j, k);
					
					var partial_hash = hashStr(partial);
					
					if(hash[partial_hash] === undefined)
					{
						hash[partial_hash] = [i];
					}
					else
					{
						hash[partial_hash].push(i);
					}
				}
			}
		}
	}
	
	// @method hashText()
	// When textbox is modified, get suggested locations based on input.
	function hashText(inputID, outputID, outputLimit, callbackName)
	{
		var str = document.getElementById(inputID).value;
		clean_str = str.toLowerCase().replace("'", "");
		document.getElementById(outputID).innerHTML = "";
		
		if(clean_str.length < 2)
		{
			return;
		}
		
		var str_hash = hashStr(clean_str);
		
		if(hash[str_hash] === undefined)
		{
			document.getElementById(outputID).innerHTML = "<span class='search-result'>No matches found.</span>";
		}
		else
		{
			var results = hash[str_hash];
			
			var freq = {};
			for(var i = 0; i < results.length; i++)
			{
				freq[results[i]] = (freq[results[i]] === undefined) ? 1 : freq[results[i]] + 1;
			}
			
			var suggestions = [];
			
			for(var key in freq)
			{
				suggestions.push(key);
			}
			
			suggestions.sort(function(a, b) { return (freq[b] - freq[a]);});
			var limit = (suggestions.length < outputLimit) ? suggestions.length : outputLimit;
			
			for(var i = 0; i < limit; i++)
			{
				var name = features[suggestions[i]][3];
				var reg = new RegExp(str, 'gi');
				name = name.replace(reg, function(str) { return "<b>" + str + "</b>"; });
				
				document.getElementById(outputID).innerHTML += "<a class='search-result' style='text-decoration: none;' onclick='" + callbackName + "(" + suggestions[i] + ");'>" + name + "</a>";
			}
		}
	}
