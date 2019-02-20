
	// Global variables to be used throughout program
	var map;
	var polyline;
	var connLine1;
	var connLine2;
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

		map.attributionControl.setPrefix('<a href="https://leafletjs.com/" target="_blank">Leaflet</a>');
		
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
			admin: 'images/office-ico.svg',
			interest: 'images/interest-ico.svg',
			dorm: 'images/dorm-ico.svg',
			classroom: 'images/classroom-ico.svg',
			food: 'images/food-ico.svg',
			printer: 'images/printer-ico.svg',
			bathroom: 'images/inclusive-ico.svg'
			recreation: 'images/recreation-ico.svg'
			library: 'images/library-ico.svg'
			services: 'images/services-ico.svg'
		};
		
		var urlAddress = window.location.href.trim();
		var tagsArray = urlAddress.slice( urlAddress.indexOf("?") + 1 ).split("&");
		
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
						if(tagsArray.length === 1)
							addMarker(tag[1], true);
						else
							addMarker(tag[1], false);
					}
					break;
			}	
		}

		tryCount = 0;
		buildLoc = -1;
		showSat = false;
		locating = false;
		markerDragging = false;
		initHash();
		fillContent();
		
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
				var newdiv = L.DomUtil.create('div', 'section-list');
				newdiv.id = divID;
				var checkID = features[i][2] + "-check";
				newdiv.innerHTML = "<h3>" + features[i][2] + "<input id='" + checkID + "' type='checkbox' class='section-check' onclick='checkedLocation(\"" + features[i][2] + "\");'> </h3> ";
				var tablediv = L.DomUtil.create('div', 'temp3');
				tablediv.id = tableID;
				tablediv.innerHTML = "";
				newdiv.appendChild(tablediv);
				document.getElementById("location-list").appendChild(newdiv);
			}
			
			document.getElementById(tableID).innerHTML +=  "<div class='temp' onclick='openMarker(" + i + ");'>" + features[i][3] + "</div>";
		}
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

		marker.on('click', function() {
			cleanMap();
			sidebar.showLayer(1);

			document.getElementById("location-content").innerHTML = "";
			
			document.getElementById("image-block").removeChild(document.getElementById("image-block").firstChild);
			
			var locationImage = L.DomUtil.create('img');
			locationImage.id = 'location-image';
			locationImage.alt = feature[3];
			locationImage.src = "locations/" + feature[3].toLowerCase() + ".jpg";
			locationImage.onerror = function() {
				locationImage.src = "locations/default-img.jpg";
			};
			
			document.getElementById("image-block").appendChild(locationImage);
			
			for(var i = 0; i < feature[4].length; i++)
			{
				for(var j = 1; j < feature[4][i].length; j++)
				{
					document.getElementById("location-content").innerHTML += "<img src='images/" + feature[4][i][0] + "-ico.png'></img>" + feature[4][i][j] + "<br>";
					
				}
				document.getElementById('location-content').innerHTML += "<br>";
			}

			marker.closePopup();
			map.setView(marker.getLatLng(), 18);
		});
		
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

	function addType(type)
	{
		for(var i = 0; i < features.length; i++)
		{
			if(features[i][2] === type)
			{
				addMarker(i, false);
			}
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
				connLine1.setStyle({color: '#d9d900'});
				connLine2.setStyle({color: '#d9d900'});
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
				connLine1.setStyle({color: '#005ef7'});
				connLine2.setStyle({color: '#005ef7'});
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
			case 2: message = "The location service failed. Please try again.";
				break;
			case 3: message = "The location service timed out. Please try again.";
				break;
			case 4: message = "The location accuracy is too low. Please try again.";
				break;
			case 5: message = "Your location is not within NCCU bounds.";
				break;
		}
		message += " Please drag marker to your location.";
		
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
			map.removeLayer(connLine1);
			map.removeLayer(connLine2);
		}

		if(myMarker !== undefined)
		{
			map.removeLayer(myMarker);
		}
		
		myMarker = L.marker([35.9738346, -78.8982177], {zIndexOffset: 1000, icon: L.icon({iconUrl: 'images/YAH-ico.svg', iconSize: [32, 36], iconAnchor: [10, 10], popupAnchor: [0, -18]})}).addTo(map);

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
		
		myMarker = L.marker(position, {zIndexOffset: 1000, icon: L.icon({iconUrl: 'images/YAH-ico.svg', iconSize: [32, 36], iconAnchor: [10, 10], popupAnchor: [0, -18]})}).addTo(map);
		
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
					"Ok": function() {
						$(this).dialog("close");
						callback();
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
						alert("Please drag the marker to where you are");	
						setTimeout(function() {setLocation(myMarker.getLatLng());}, 10000);
					}
				}
			});
			$( "#confirm-location" ).dialog("moveToTop");
		});
	}
	
	// @method getDistance(<LatLng {lat, lng}> pos1, pos2): <Number> distance
	// Returns Squared Euclidean Distance based on two geographic positions.
	function getDistance(pos1, pos2)
	{
		var disx = (pos2.lat - pos1.lat);
		var disy = (pos2.lng - pos1.lng);
		
		var distance = (disx * disx) + (disy * disy);
		return distance;
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
			map.removeLayer(connLine1);
			map.removeLayer(connLine2);
		}
	}
	
	// @method directionPopup(<Number> index)
	// Displays popup for getting directions to selected marker
	function directionPopup(index)
	{
		cleanMap();
		
		// Set content
	}
	
	function locationFocus()
	{
		document.getElementById("check1").checked = true;
		locationSelected();
	}

	// @method locationSelected()
	// Locates user when "Your location" is selected and location has not been previously found.
	function locationSelected()
	{
		if(document.getElementById("check1").checked && myMarker === undefined)
		{
			attemptLocate();
		}
	}
	
	// @method getDirections(<Number> end_index)
	// Draws a polyline along route after finding best path using Dijkstra's shortest path algorithm.
	function getDirections(end_index)
	{
		var canAccess = !document.getElementById("accessBox").checked;
		var start_index = 0;
		
		if(document.getElementById("check1").checked)
		{
			if(myMarker === undefined)
			{
				return;
			}
			
			var distance = Number.MAX_VALUE;
		
			for(var i = 0; i < sidewalks.length; i++)
			{
				var pos = {
					lat: sidewalks[i][0],
					lng: sidewalks[i][1]
				};
			
				var newdist = getDistance(myMarker.getLatLng(), pos);
			
				if(newdist < distance)
				{
					distance = newdist;
					start_index = i;
				}
			}
			
			cleanMap();
						
			connLine1 = L.polyline([[myMarker.getLatLng().lat, myMarker.getLatLng().lng], [sidewalks[start_index][0], sidewalks[start_index][1]]], {color: '#005ef7', dashArray: '10,10', weight: 5, opacity: 1}).addTo(map);
		}
		else if(document.getElementById("check2").checked)
		{
			if(buildLoc === end_index)
			{
				return;	
			}
			
			var featIndex = buildLoc;
			addMarker(featIndex, features[featIndex][2], false);
			
			connLoop:
			for(var i = 0; i < connections.length; i++)
			{
				if(i === connections.length - 1 && connections[i][1] !== featIndex)
				{
					return;
				}
				
				if(connections[i][1] === featIndex)
				{
					if(connections[i][2] || canAccess)
					{
						start_index = connections[i][0];
						cleanMap();
						connLine1 = L.polyline([[features[featIndex][0], features[featIndex][1]], [sidewalks[start_index][0], sidewalks[start_index][1]]], {color: '#005ef7', dashArray: '10,10', weight: 5, opacity: 1}).addTo(map);
						break connLoop;
					}
				}
			}
			
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
						connLine2 = L.polyline([[features[end_index][0], features[end_index][1]], [sidewalks[currentNode][0], sidewalks[currentNode][1]]], {color: '#005ef7', dashArray: '10,10', weight: 5, opacity: 1}).addTo(map);
						
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
		
		var index = currentNode;
		var latlngs = [[sidewalks[currentNode][0], sidewalks[currentNode][1]]];
		
		while (index !== start_index) 
		{
			index = prevNodes[index];
			latlngs.push([sidewalks[index][0], sidewalks[index][1]]);
		}
		
		polyline = L.polyline(latlngs, {color: '#005ef7', interactive: false, weight: 5, opacity: 1});
		
		if(showSat)
		{
			polyline = L.polyline(latlngs, {color: '#d9d900', interactive: false, weight: 5, opacity: 1});
			connLine1.setStyle({color: '#d9d900'});
			connLine2.setStyle({color: '#d9d900'});
		}
		
		map.addLayer(polyline);
		
		var group = new L.featureGroup([polyline, connLine1, connLine2]);
		
		setTimeout(function() {
			map.fitBounds(group.getBounds());
		}, 400);
		
		var minutes = Math.ceil(nodeWeights[currentNode] / 60);
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
				
				document.getElementById(outputID).innerHTML += "<a class='search-result' style='text-decoration: none;' onclick='" + callbackName + "(" + suggestions[i] + ");'>" + name + "</a><hr class='search-result-hr'>";
			}
		}
	}
