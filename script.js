/*
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./serviceworker.js');
};
*/

$(document).ready(setupApp);

var paths = null;
var settings = null;
var routes = null;


function setupApp(e)
{
	// undim
	$('body').css('opacity', '1.0');
	
	// bind handlers
	$('#modalConsentShow').click(modalConsentShow);
	$('#modalConsentReject').click(modalConsentReject);
	$('#modalConsentAccept').click(modalConsentAccept);

	// load paths
	$.getJSON("data/paths/", function(dataPaths) {
		paths = dataPaths;

		// load settings
		$.getJSON("data/settings/", function(dataSettings) {
			settings = dataSettings;

			// load routes
			$.getJSON("data/routes/", function(dataRoutes) {
				routes = dataRoutes;

				// get consent from user
				modalConsentShow();
			});
		});
	});

	// prepare embed size and handle resizes
	$(window).resize(resizeContainer);
	resizeContainer();  
}

function resizeContainer(e)
{
	// define embed size
	let availableSize = {
		width:  $(window).width(),
		height: $(window).height() /*- $("nav").height()*/
	};

	// apply embed size
	$(".viewport").css("width", availableSize.width); // all views
	$(".viewport").css("min-height", availableSize.height); // all views
	$("#map").css("height", availableSize.height); // map only
	
}

var modalConsent; 
function modalConsentShow()
{


	$("#map > p").css('display', 'none');

	if (getCookie(settings.consent.cookieName) === null)
	{

		modalConsent = new bootstrap.Modal(document.getElementById("modalConsent"), {
		  keyboard: false,
		  backdrop: "static"
		});

		modalConsent.show();

	}
	else
	{
		modalConsentAccept(false);
	}
}

function modalConsentReject()
{
	$('.modal-backdrop').remove();
	$("#map > p").css('display', 'block');
	modalConsent.remove();
}

function modalConsentAccept(renewCookie = true)
{
	$('.modal-backdrop').remove();
	$('.menu-item[data-menuitem="map"]').click();
	
	if (renewCookie)
	{
		setCookie(settings.consent.cookieName, settings.consent.cookieValue, settings.consent.cookieDuration);
		//addToHomescreen();
	}
	setupMap();
	setupPaths();
	updateBuses();
	//updateRoutes(); /* included in updateBuses */
} 

var map;
function setupMap()
{ 
	// define map options from settings
	var mapOptions = {
	 center: [
	 	settings.map.initialPosition.lat, 
	 	settings.map.initialPosition.lng
	 ],
	 zoom: settings.map.initialPosition.zoom
	}

	// generate map	
	map = new L.map("map", mapOptions);
	var layer = new L.TileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png");	
	map.addLayer(layer);  
}


function setupPaths()
{
	for (path in paths) 
	{
		color = settings.paths.colors[path] || settings.paths.colors["default"];;

		var latlngs = paths[path];
		var polyline = L.polyline(latlngs, {color: color, weight: 5}).addTo(map);
	}
}


var buses = Array(); 

var updateTimer = null;
function updateBuses()
{
	var busNext = {
		diff: null,
		path: null,
		start: null,
		direction: null
	};

	var now = new Date();	
	now = now.getHours() + ":" + ("0" + now.getMinutes()).slice(-2) + ":" + ("0" + now.getSeconds()).slice(-2); 
	 
	// todo: separate summer schedule
	var daytype = settings.freedays.isTodayFreeday ? "freedays" : "workdays";
	var directions = ["down", "up"];
	for (direction in directions)
	{
		for (path in paths)
		{ 				
			for (index in routes[path][directions[direction]][daytype])
			{
				var start = routes[path][directions[direction]][daytype][index];

				var dateNow = new Date("2022/01/01 " + now);
				var dateStart = new Date("2022/01/01 " + start + ":00");
			 
				var diff = (dateNow - dateStart) / (1000);		

				diff = limitBusPosition(diff, path, start, directions[direction]);
				
				
				drawBus(path, start, directions[direction], diff);				

				if (diff < 0)
				{ 
					if (diff > busNext.diff || busNext.diff === null)
					{
						busNext.diff = diff;
						busNext.path = path;
						busNext.start = start;
						busNext.direction = directions[direction];
					}

				}
			}
		}
	}
	
	if (busesActive < 1)
	{
		if (busNext.path !== null)
		{
			$('#bus-next-data').html("<i class=\"las la-arrow-right\"></i>&nbsp;Naslednji: <b>št. " + busNext.path + " ob " + busNext.start + "</b> " + generateBusRouteDescription(busNext.path, busNext.start, busNext.direction) + ".");
		}
		else
		{
			$('#bus-next-data').html("Danes ni več avtobusov.");
		} 
	} 
	
	updateNotification();
	updateRoutes();

	updateTimer = setTimeout(updateBuses, 1000);
} 

var busesActive = 0;

function drawBus(path, start, direction, offset, transition = 950)
{
	var guide = null;
	switch (direction)
	{
		case "down":
			guide = paths;
			break;
		case "up":
			guide = {};
			for (i in paths)
			{ 
				guide[i] = Array(paths[i].length);
				for (j in paths[i])
				{ 
					guide[i][j] = paths[i][paths[i].length - (j*1) - 1];
				}
			} 
			break;
		default:
			throw "Error determining guide from unknown path.";
	}

	if (offset >= (-1 * settings.visualization.busShowMinutesBefore * 60) && offset < (settings.visualization.busDelayMinutesAfter * 60))
	{
		if (offset < 0)
		{
			offset = 0;
		}

		if (typeof(buses[generateBusIndex(path, start, direction)]) === 'undefined')
		{
			// create new bus

			busesActive++;

			var busIcon = L.icon({
			    iconUrl: "images/bus-" + path + ".png",
			    iconSize: [32, 18],
			    iconAnchor: [12, 9]
			   
			}); 

			// marker
			let currentMarker = new L.Marker.movingMarker([guide[path][0], guide[path][0]], 0, {icon: busIcon});

			buses[generateBusIndex(path, start, direction)] = currentMarker;
			buses[generateBusIndex(path, start, direction)].addTo(map);

			// tooltip
			buses[generateBusIndex(path, start, direction)].bindPopup(generateBusTooltip(path, start, direction)); 

			// refresh immediately - yes, recursion, so update will happen
			drawBus(path, start, direction, offset, 0);
		}
		else
		{
			// update existing bus
 
 			// check if there are tracker data for this bus
 			$.get( "data/locations/?path=" + path + "&start=" + start + "&direction=" + direction)
			.done(function(payload) {
				if (payload.status === "OK")
				{
					// map tracker to path
					var tracker = turf.point([payload.data.lat, payload.data.lng]);
					var busDriving = turf.nearestPointOnLine(turf.lineString(guide[path]), tracker, {units: 'meters'});

					// add tracked icon
					var busIcon = L.icon({
					    iconUrl: "images/bus-" + path + "-tracked.png",
					    iconSize: [32, 18],
					    iconAnchor: [12, 9]
					   
					}); 
					buses[generateBusIndex(path, start, direction)].setIcon(busIcon);

				}
				else
				{
					// map to timeline
					var busDriving = turf.along(turf.lineString(guide[path]), pathFactor(path, offset, direction), {units: 'meters'});

					// add normal icon 
					var busIcon = L.icon({
					    iconUrl: "images/bus-" + path + ".png",
					    iconSize: [32, 18],
					    iconAnchor: [12, 9]
					   
					}); 
					buses[generateBusIndex(path, start, direction)].setIcon(busIcon);
				}

				buses[generateBusIndex(path, start, direction)].moveTo([busDriving.geometry.coordinates[0], busDriving.geometry.coordinates[1]], transition);		
			});
			
		}
	
	}
	else
	{
		if (typeof(buses[generateBusIndex(path, start, direction)]) !== 'undefined')
		{ 
			// destroy existing bus

			buses[generateBusIndex(path, start, direction)].remove();
			buses[generateBusIndex(path, start, direction)] = undefined;

			busesActive--;
		} 
	}
}

function generateBusIndex(path, start, direction)
{ 
	return "" + path + start.replace(":", "") + direction;
}

function generateBusTooltip(path, start, direction)
{
	var busColor = settings.paths.colors[path] || settings.paths.colors["default"];

	var tooltip = '';

	tooltip += '<div class="row">';
	tooltip += '<div class="col-9" style="color: ' + busColor.substring(0, 7) + ';">';
	tooltip += 'Štart ob <b>' + start + '</b> ';
	tooltip += generateBusRouteDescription(path, start, direction);
	tooltip += '.</div>';	

	tooltip += '<div class="col-3">';
	tooltip += '<div class="bus-tooltip-number" style="background-color: ' + busColor.substring(0, 7) + ';">' + path + '</div>';
	tooltip += '</div>';

	let trackerId = Math.random().toString().substr(2, 8);

	//tooltip += '<div class="col-12"><button id="tracker-' + trackerId + '" data-path="' + path + '" data-start="' + start + '" data-direction="' + direction + '" class="btn btn-bus btn-tooltip-track" onclick="trackBus(this)"><div class="track-ico"></div>Sem na tem avtobusu</button></div><div class="btn btn-bus btn-tooltip-track btn-tooltip-tracking-off" id="tracker-' + trackerId + '-off" onclick="trackingOff();"><div class="track-ico"></div>Ustavi sledenje</div>';

	tooltip += '</div>';

	return tooltip;
} 

function generateBusRouteDescription(path, start, direction)
{ 
	if (direction == 'down')
	{
		switch (path * 1)
		{
			case 1:
			case 2:
				return 'iz Solkana <b>proti Šempetru pri Gorici</b>';
			case 4:
				if (start === "8:05" || start === "11:50")
				{
					return 'iz Lok <b class="accent">proti Novi Gorici</b>';
				}
				else 
				{
					return 'iz Lok <b>proti Šempetru pri Gorici</b>';
				}
			default:
				return 'iz neznane smeri (napaka: ' + path + ').';
		}
	}
	else if (direction == 'up')
	{
		switch (path * 1)
		{
			case 1:
			case 2:
				return 'iz Šempetra pri Gorici <b>proti Solkanu</b>';
			case 4:
				return 'iz Šempetra pri Gorici <b>proti Lokam</b>';
			default:
				return 'iz neznane smeri (napaka: ' + path + ').';
		}
	}
	else
	{
		return 'iz neznane smeri (napaka: ' + direction + ').';
	}
}

function pathFactor(path, offset, direction)
{ 	
	switch (path)
	{
		case "1":
			switch (direction)
			{
				case "up":
					return offset * 8.0; 

				case "down":
					return offset * 8.0; // maybe 8.5 before Nova Gorica (center)
				
				default: 
					throw "Unsupported direction when calculating factor.";
			} 

		case "2":
			switch (direction)
			{
				case "up":
					return offset * 8.0; 

				case "down":
					return offset * 8.0; 
				
				default: 
					throw "Unsupported direction when calculating factor.";
			} 

		case "4":
			switch (direction)
			{
				case "up":
					return offset * 8.0; 

				case "down":
					return offset * 8.0; 
				
				default: 
					throw "Unsupported direction when calculating factor.";
			} 
			
		default: 
			throw "Unsupported path when calculating factor.";
	}
}

function limitBusPosition(diff, path, start, direction)
{

	if (path == "4" && (start == "8:05" || start == "11:50") && direction == "down" && !settings.freedays.isTodayFreeday)
	{
		return (diff > 855 ? 999999 : diff);
	}
	else
	{
		return diff;
	}
}

function updateRoutes()
{
	let htmlRoutes = '';

	Object.entries(routes).forEach(([route, directions]) => {


		htmlRoutes += '<h2 class="route" style="color: ' + settings.paths.colors[route].substring(0, 7) + '">' + route + '</h2>';

		Object.entries(directions).forEach(([direction, days]) => {

			htmlRoutes += '<h3 class="route-direction">' + generateBusRouteDescription(route, null, direction) + '</h3>';

			htmlRoutes += '<div class="route-hours">'
			let count = 0;

			Object.entries(days[settings.freedays.isTodayFreeday ? 'freedays' : 'workdays']).forEach(([day, hour]) => {

				let now = new Date();	
				now = now.getHours() + ":" + ("0" + now.getMinutes()).slice(-2) + ":" + ("0" + now.getSeconds()).slice(-2); 
				let dateNow = new Date("2022/01/01 " + now);
				let dateStart = new Date("2022/01/01 " + hour + ":00");
				
				let diff = (dateNow - dateStart) / (1000);
				// not necessary to call limitBusPosition() here!

				if (typeof(buses[generateBusIndex(route, hour, direction)]) === 'undefined')
				{
					htmlRoutes += '<span class="route-hour"' + (diff < 0 ? ' style="background-color: ' + settings.paths.colors[route].substring(0, 7) + '; color: #ffffff; border: 0;"' : '') + '">' + hour + '</span>';
				}
				else
				{
					htmlRoutes += '<span onclick="trackingPopup(\'' + generateBusIndex(route, hour, direction) + '\');" class="route-hour route-hour-active"' + (diff < 0 ? ' style="background-color: ' + settings.paths.colors[route].substring(0, 7) + '; color: #ffffff; border: 0;"' : '') + '">' + hour + '</span>';	
				}
				count++;

			});		 

			if (count == 0)
			{
				htmlRoutes += '<span class="route-hour route-hour-empty">' + 'Danes ni avtobusov na tej progi.' + '</span>';
			} 
			htmlRoutes += '</div>';

		});
	});

	$('#routes-data').html(htmlRoutes); 
}


var updater = null;

function updateLocation(position)
{
	if (tracker.path == null || tracker.start == null || tracker.direction == null)
	{
		updater = null;
		return;
	}

	$('.menu-item-tracking').css('display', 'inline-block');

	tracker.lat = position.coords.latitude;
	tracker.lng = position.coords.longitude;

	$.post( "data/locations/", tracker)
	.done(function(data) {
		// nothing
	});

	updater = setTimeout(function() {trackBus(null);}, 2000);
}

var tracker = {
	path: null,
	start: null,
	direction: null,
	lat: null,
	lng: null,
	buttonId: null
};

function trackBus(e)
{
	if (e !== null)
	{ 
		tracker.path = e.dataset.path;
		tracker.start = e.dataset.start;
		tracker.direction = e.dataset.direction;

		tracker.buttonId = e.id;
	}

	if (navigator.geolocation) 
	{ 
		$('#' + tracker.buttonId).css('display', 'none');
		$('#' + tracker.buttonId + '-off').css('display', 'block');
	    navigator.geolocation.getCurrentPosition(updateLocation);
	} 
	else 
	{
	    $('#' + tracker.buttonId).html("Omogočite lokacijo!");	
	}
}

function trackingOff()
{
	clearTimeout(updater);
	updater = null;

	tracker.path = null;
	tracker.start = null;
	tracker.direction = null;
	
	$('.menu-item-tracking').css('display', 'none');
	$('#' + tracker.buttonId).css('display', 'block');
	$('.btn-tooltip-tracking-off').css('display', 'none');

	tracker.buttonId = null;
}

function trackingPopup(which)
{
	if (menuActive != "map")
	{ 
		$('.menu-item[data-menuitem="map"]').click();
	}

	if (which === null)
	{
		buses[tracker.path + tracker.start + tracker.direction].openPopup();
		$('#' + tracker.buttonId).css('display', 'none');
		$('#' + tracker.buttonId + '-off').css('display', 'block');
	}
	else
	{
		buses[which].openPopup();
	}
}

function updateNotification()
{
	if (menuActive == "map" || typeof(menuActive) == 'undefined')
	{
		$('#notification').css('display', ((busesActive < 1) ? 'block' : 'none'));
	}
	else 
	{
		$('#notification').css('display', 'none');
	}
}

function isScreenLockSupported() 
{
  return ('wakeLock' in navigator);
}

async function getScreenLock() 
{
  if(isScreenLockSupported()){
    let screenLock;
    try {
       screenLock = await navigator.wakeLock.request('screen');
    } catch(err) {
       console.log(err.name, err.message);
    }
    return screenLock;
  }
}

let screenLock = getScreenLock();

function setCookie(name,value,days) 
{
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) 
{
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}


var menuActive;
function menuItem(which)
{
	menuActive = which.dataset.menuitem;

	$('.menu-item:not(#map)').removeClass('menu-item-active');
	$(which).addClass('menu-item-active');


	if (getCookie(settings.consent.cookieName) == null)
	{
		return;
	}


	var viewports = $('.viewport');
	for (i = 0; i < viewports.length; i++)
	{
		if (viewports[i].id == menuActive)
		{
			$('#' + viewports[i].id).addClass("d-block").removeClass("d-none");
		}
		else
		{
			$('#' + viewports[i].id).removeClass("d-block").addClass("d-none");
		}
	}

	analytics_pavliha_eu.trackPageView(which);

	updateNotification();
}

var analytics_pavliha_eu = Matomo.getTracker("https://analytics.pavliha.eu/matomo.php", 1);