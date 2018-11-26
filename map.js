
	// Global variables to be used throughout program
	var map;
	var polyline;
	var connLine1;
	var connLine2;
	var myMarker;
	var tryCount;
	var hash;
	var locating;
	var sidebar;
	var locationSidebar;
	var icons;
	var activeMarkers;
	var markerDragging;
	var showSat;
	var satView;
	var mapView;
	var buildLoc;
	
	// @method initMap()
	// Called on page load to initialize variables, set up map, and add controls and markers.
	function initMap()
	{
		if (location.protocol === 'http:')
		{
			location.href = 'https:' + window.location.href.substring(window.location.protocol.length);
		}
		
		tryCount = 0;
		buildLoc = -1;
		showSat = false;
		locating = false;
		markerDragging = false;
		initHash();
		activeMarkers = [];
		
		map = L.map('map', {
			center: [35.9738346, -78.8982177],
			zoom: 16,
			minZoom: 15,
			zoomControl: false
		});

		map.attributionControl.setPrefix('<a href="https://leafletjs.com/" target="_blank">Leaflet</a> | Sidebar @ <a href="https://github.com/Turbo87/leaflet-sidebar" target="_blank">Turbo87</a>');
		
		mapView = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
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
		
		sidebar = L.control.sidebar('sidebar', {
            closeButton: false,
            position: 'left'
        });
        map.addControl(sidebar);
		
		if(!L.Browser.mobile)
		{
			setTimeout(function () {
				sidebar.show();
			}, 300);
		}
		
		locationSidebar = L.control.sidebar('locationSidebar', {
			closeButton: false,
			position: 'left'
		});
		map.addControl(locationSidebar);
		
		L.Control.Button = L.Control.extend({
			options: {
				position: 'topleft'
			},
			onAdd: function() {
				var div = L.DomUtil.create('div', 'command');
				div.innerHTML = "<input class='customButton' id='sidebarButton' type='image' src='images/hamburger.png' onclick='locationSidebar.hide(); sidebar.toggle();'>";
				return div;
			}
		});
		L.control.button = function() { return new L.Control.Button(); };
		
		L.Control.View = L.Control.extend({
			options: {
				position: 'bottomright'
			},
			onAdd: function() {
				var div = L.DomUtil.create('div', 'command');
				div.innerHTML = "<input class='customButton' id='changeView' type='image' src='images/earth.png' onclick='switchTileLayer();'>";
				return div;
			}
		});
		L.control.view = function() { return new L.Control.View(); };
		
		L.Control.Locate = L.Control.extend({
			options: {
				position: 'topright'
			},
			onAdd: function() {
				var div = L.DomUtil.create('div', 'command');
				div.innerHTML = "<input class='customButton' id='locateButton' type='image' src='images/locate.png' onclick='attemptLocate();'>";
				return div;
			}
		});
		L.control.locate = function() { return new L.Control.Locate(); };
		
		L.control.button().addTo(map);
		L.control.view().addTo(map);
		L.control.locate().addTo(map);
		
		L.DomEvent.disableClickPropagation(document.getElementById("sidebar"));
		L.DomEvent.disableClickPropagation(document.getElementById("textField"));
		L.DomEvent.disableClickPropagation(document.getElementById("locateButton"));
		L.DomEvent.disableClickPropagation(document.getElementById("changeView"));
				
		map.on('locationfound', onLocationFound);
		map.on('locationerror', locationError);
		
		icons = {
			parking: 'images/parking-ico.svg',
			office: 'images/office-ico.svg',
			interest: 'images/interest-ico.svg',
			dorm: 'images/dorm-ico.svg',
			classroom: 'images/classroom-ico.svg',
			food: 'images/food-ico.svg',
			printer: 'images/printer-ico.svg',
			bathroom: 'images/inclusive-ico.svg'
		};
		
		for(var i = 0; i < features.length; i++)
		{
			var feature = features[i];
			
			var table = "tbl" + feature[2].charAt(0).toUpperCase() + feature[2].slice(1);
			var string = "<tr onclick='openMarker(" + i + ")' onMouseOver='rowOnHover(" + i + ");' onMouseOut='rowOffHover(" + i + ");'><td>" + feature[3] + "</td></tr>";
			document.getElementById(table).innerHTML += string;
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

	function rowOnHover(index)
	{
		for(var i = 0; i < activeMarkers.length; i++)
		{
			if(activeMarkers[i].index === index)
			{
				map.setView(activeMarkers[i].getLatLng());
				activeMarkers[i].setIcon(L.icon({iconUrl: icons[activeMarkers[i].mType], iconSize: [40, 46], iconAnchor: [20, 10], popupAnchor: [0, -10]}));
				activeMarkers[i].openPopup();
				
				var icon = activeMarkers[i].options.icon;
				activeMarkers[i].options.zIndexOffset = 100;
				icon.options.iconSize = [40, 40];
				activeMarkers[i].setIcon(icon);
				return;
			}
		}
	}

	function rowOffHover(index)
	{
		for(var i = 0; i < activeMarkers.length; i++)
		{
			if(activeMarkers[i].index === index)
			{
				activeMarkers[i].setIcon(L.icon({iconUrl: icons[activeMarkers[i].mType], iconSize: [26, 30], iconAnchor: [20, 10]}));
				activeMarkers[i].closePopup();
				
				var icon = activeMarkers[i].options.icon;
				activeMarkers[i].options.zIndexOffset = 0;
				icon.options.iconSize = [26, 30];
				activeMarkers[i].setIcon(icon);
				return;
			}
		}
	}

	function clearAll()
	{
		var types = ["classroom", "dorm", "food", "interest", "office", "parking", "printer",  "bathroom"];
		
		for(var i = 0; i < types.length; i++)
		{
			var type = types[i];
			
			var name = "chk" + type.charAt(0).toUpperCase() + type.slice(1);
			
			if(document.getElementById(name).checked)
			{
				document.getElementById(name).checked = false;
				checkedLocation(type);
			}
		}
		
		for(var i = 0; i < activeMarkers.length; i++)
		{
			map.removeLayer(activeMarkers[i]);
		}
		activeMarkers = [];
		
		cleanMap();
	}

	function addMarker(index, type, openUp)
	{
		for(var i = 0; i < activeMarkers.length; i++)
		{
			if(activeMarkers[i].index === index)
			{
				return;	
			}
		}
		
		var feature = features[index];
		var marker = L.marker([feature[0], feature[1]], {zIndexOffset: 0, interactive: true, icon: L.icon({iconUrl: icons[feature[2]], iconSize: [26, 30], iconAnchor: [10, 10]})});
		marker.mType = type;
		marker.index = index;

		marker.bindPopup(feature[3]);

		marker.on('click', function() {
			cleanMap();
			
			sidebar.hide();
			
			var customPopup = "<p class='location-name'><b>" + feature[3] + "</b></p>";
			var len = feature.length - 4;
			for(var j = 0; j < len; j++)
			{
				customPopup += "<div class='add-info'>" + feature[4+j] + "</div><hr class='add-info-hr'>";
			}
			customPopup += "<a href='#' onclick='directionPopup(" + index + ");'><button class='side-btn'><img class='side-btn-img' src='images/direction-ico.png'/>Directions</button></a>";

			document.getElementById("buildingname").innerHTML = customPopup;

			marker.closePopup();
			map.setView(marker.getLatLng(), 18);
			
			setTimeout(function() {
				locationSidebar.show();
			}, 300);
		});
		
		marker.on('mouseover', function() {
			if(!markerDragging) 
			{
				var icon = marker.options.icon;
				marker.options.zIndexOffset = 100;
				icon.options.iconSize = [40, 40];
				marker.setIcon(icon);					
			}
		});
			
		marker.on('mouseout', function() {
			if(!markerDragging) 
			{
				var icon = marker.options.icon;
				marker.options.zIndexOffset = 0;
				icon.options.iconSize = [26, 30];
				marker.setIcon(icon);
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

	function checkedLocation(type)
	{
		var name = "chk" + type.charAt(0).toUpperCase() + type.slice(1);

		if(document.getElementById(name).checked)
		{
			for(var i = 0; i < features.length; i++)
			{
				var feature = features[i];
			
				if(feature[2] === type)
				{
					addMarker(i, type, false);
				}
			}
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
	
	// @method attemptLocate()
	// Acts as binary lock on locating user
	function attemptLocate()
	{
		if(locating)
		{
			return;
		}
		
		document.getElementById("locateButton").src = "images/spinner.gif";
		locating = true;
		
		map.locate();
	}
	
	// @method switchTileLayer()
	// Changes map view between plain map and satellite
	function switchTileLayer()
	{
		if(!showSat)
		{
			document.getElementById("changeView").src = "images/map.png";
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
			document.getElementById("changeView").src = "images/earth.png";
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
	
	
	// @method locationError(<ErrorEvent {code}> err)
	// Handles errors caused by location tracking either failing or location not being acceptable.
	// Error code legend -> 1: Location denied,	2: Position Unobtainable, 3: Location timeout, 4: Low accuracy, 5: Location not within bounds
	function locationError(err)
	{
		switch(err.code)
		{
			case 1: alert("Please turn on location and allow the app to use your location.");
				failedLocation();
				break;
			case 2: 
			case 3: 
			case 4: 
			case 5:
				if(tryCount >= 3)
				{
					failedLocation();
					return;
				}
				tryCount++;
				map.locate({maximumAge: 0, timeout: 4000});
				break;
		}
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
		
		sidebar.hide();
		locationSidebar.hide();
		
		myMarker = L.marker([35.9738346, -78.8982177], {zIndexOffset: 500, icon: L.icon({iconUrl: 'images/YAH-ico.svg', iconAnchor: [10, 10], popupAnchor: [0, -18]})}).addTo(map);

		myMarker.on('dragstart', function() {
			markerDragging = true;
		});
		
		myMarker.on('dragend', function() {
			markerDragging = false;
		});
		
		alert("Failed to find user. Please drag marker to your location.");
		
		myMarker.dragging.enable();
		tryCount = 0;
		
		setTimeout(function() { map.setView(myMarker.getLatLng(), 17); }, 300);
				
		setTimeout(function() {locateUser(myMarker.getLatLng());}, 10000);
	}
	
	// @method onLocationFound(<LocationEvent {latlng, accuracy, ...}> position)
	// When a location is found, check for accurate location and start to verify location
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
		
		locateUser(position.latlng);
	}
	
	// @locateUser(<LatLng {lat, lng}> position)
	// Find closest building to user location and prompt if location is correct, allowing user to correct any mistake.
	function locateUser(position)
	{
		if(myMarker !== undefined)
		{
			map.removeLayer(myMarker);	
		}
		
		myMarker = L.marker(position, {icon: L.icon({iconUrl: 'images/YAH-ico.svg', iconAnchor: [10, 10], popupAnchor: [0, -18]})}).addTo(map);
		
		map.setView(position, 18);
		setTimeout(function() {verifyLocation();}, 500);
	}
	
	// @method verifyLocation()
	// Allows user to confirm marker location as accurate or correct if wrong.
	function verifyLocation()
	{
		$(function() {
			$( "#dialog" ).dialog({
				dialogClass: "no-close",
				resizable: false,
				draggable: false,
				modal: true,
				buttons: {
					"Yes": function() {
						$( this ).dialog( "close" );
						locationVerified();
					},
					"No":  function() {
						$( this ).dialog( "close" );
						locationUnverified();
					}
				}
			});
		});
	}

	function locationVerified()
	{
		document.getElementById("locateButton").src = "images/locate.png";
		myMarker.dragging.disable();
		locating = false;
	}

	function locationUnverified()
	{
		myMarker.dragging.enable();
		alert("Please drag the marker to where you are");	
		setTimeout(function() {locateUser(myMarker.getLatLng());}, 10000);
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
		
		var popupMessage = "<p class='location-name'>Directions to: " + features[index][3] + "</p>";
		popupMessage += "<p class='sidebar-para' style='line-height: 40px;'>Choose your starting point:<br></p>";
		popupMessage += "<label class='radio-cont'><img src='images/myLoc.png'></img>Your Location<input type='radio' onclick='locationSelected();' id='check1' name='choices'><span class='radio-chk'></span></label><br>";
		popupMessage += "<div class='enter-loc'><label class='radio-cont'><input type='radio' name='choices' id='check2'>  <img src='images/inside-ico.png'></img><span class='radio-chk'></span></label><input id='locationBox' onclick='textFocus();' oninput='hashBuild();' style='border-radius: 3px;' placeholder='Enter a location'></div><p id='locations'></p><br>";
		popupMessage += "<label class='accessDiv'>Accessible routes only?<input style='height: 18px; width: 18px;' id='accessBox' type='checkbox'><span class='accessChk'></span></label>";
		popupMessage += "<a href='#' onclick='getDirections(" + index + ");'><button class='side-btn'><img class='side-btn-img' src='images/start-ico.png'/>Start Route</button></a>";
		
		document.getElementById("buildingname").innerHTML = popupMessage;
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
			locationSidebar.hide();
			attemptLocate();
		}
	}
	
	// @method textFocus()
	// Selects the "Location on campus" checkbox when textbox is clicked.
	function textFocus()
	{
		document.getElementById("check2").checked = true;
	}
	
	// @class edge
	// Represents an "edge" from one position to another (to_edge), the distance to that point from the starting position (distance), and if it is handicap-accessible (accessible)
	class edge
	{
		constructor(to_ed, dist, acc)
		{
			this.to_edge = to_ed;
			this.distance = dist;
			this.accessible = acc;
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
			myMap.get(edges[i][0]).push(new edge(edges[i][1], edges[i][3], edges[i][2]));
			myMap.get(edges[i][1]).push(new edge(edges[i][0], edges[i][3], edges[i][2]));
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
				
				if(newEdge.accessible || canAccess)
				{
					if (nodeWeights[currentNode] + newEdge.distance < nodeWeights[newEdge.to_edge] )
					{
						nodeWeights[newEdge.to_edge] = nodeWeights[currentNode] + newEdge.distance;
						prevNodes[newEdge.to_edge] = currentNode;
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
		
		sidebar.hide();
		locationSidebar.hide();
		
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
		
		// var minutes = Math.ceil(nodeWeights[currentNode] / 60);
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
	function hashText()
	{
		var str = document.getElementById("textField").value.toLowerCase();
		str = str.replace("'", "");

		document.getElementById("suggestions").innerHTML = "";
		
		if(str.length < 2)
		{
			return;
		}
		
		var str_hash = hashStr(str);
		
		if(hash[str_hash] === undefined)
		{
			document.getElementById("suggestions").innerHTML = "<span class='indented'>No matches found.</span>";
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
			var limit = (suggestions.length < 5) ? suggestions.length : 5;
			
			for(var i = 0; i < limit; i++)
			{
				document.getElementById("suggestions").innerHTML += "<a class='indented' href='#' style='text-decoration: none' onclick='openMarker(" + suggestions[i] + ");'>" + features[suggestions[i]][3] + "</a><hr class='suggestions-hr'>";
			}
		}
	}
	
	// @method hashBuild()
	// When direction location text box is modified, get suggested locations based on input.
	function hashBuild()
	{
		var str = document.getElementById("locationBox").value.toLowerCase();
		str = str.replace("'", "");
		document.getElementById("locations").innerHTML = "";
		
		if(str.length < 2)
		{
			return;
		}
		
		var str_hash = hashStr(str);
		
		if(hash[str_hash] === undefined)
		{
			document.getElementById("locations").innerHTML = "<span class='indented'>No matches found.</span>";
		}
		else
		{
			var results = hash[str_hash];
			var limit = (results.length < 3) ? results.length : 3;
			
			for(var i = 0; i < limit; i++)
			{
				document.getElementById("locations").innerHTML += "<a class='indented' style='text-decoration: none;' onclick='findBuilding(" + results[i] + ");' href='#'>" + features[results[i]][3] + "</a><hr class='suggestions-hr'>";
			}
		}
	}