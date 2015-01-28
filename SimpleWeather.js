//Hello and thank you for checking out Simple Weather, an easy to use weather App made by Tom Mahle.
//I hope you enjoy looking through the code. Feel free to reach out to me with any questions at TomMahle@gmail.com
	var url = ""; 
	var request = new XMLHttpRequest();
	var debugLocation = false;
	var debugUrl = false;
	var debugCache = false;
	var unitString = "imperial"; //Default to Imperial units, as most of our end users at Corvisa likely prefer it.
	var unitDisplay = "° F"; //How temperature units will be displayed
	var numDaysToForecast = 0; //Number of days to forecast
	var savedPosition = {}; //Stores position data to access outside of callback functions
	var weatherActive = {}; //Same for weather
	//Used to make intuitive forecasting date display:
	var date = new Date();
	var weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday",
	"Friday","Saturday"]
	var cachedWeather = []; //Store weather data to cut down on api pings.
	var dayToday = weekdays[date.getDay()];
	var dateToday = date.getDate();
	var monthToday = date.getMonth();
	var textBox = {}
	var appIdString = ""//"&APPID=9006d05a589c4fa48d3f4eae5fa93adc" ///This App's ID in the openweather API... it tends to slow things down in my testing.

				
		
	function trim (str) {
		return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}

	$( document ).ready( function() {		
		//If we're going to be asking for location data we should do it immediately:	
		loadGeoData();
		var select = document.getElementById("savedFavorites");
		var search = document.getElementById("citySearch");
		var settingsTab = document.getElementById("settingsTab");
		$(".chosen-select").chosen();
		$("#settingsTab").addClass("inactive"); //This needs to stay after the .chosen to play nice.
		$("#searchForm").submit(function() {
			loadWeatherData();
		});		
		//these two functions are used to make the city search grey out and to make it
		//more clear that the text box is not being used for search.			
		$("#citySearch").focus( function(){		
			$("#citySearch").removeClass("blur");
			$("#citySearch").addClass("focus");
			if(search.value === search.defaultValue){ 
				search.value="";
			}
		})
		$("#citySearch").blur( function(){	
			if(trim(search.value) === ""){ 
				search.value=search.defaultValue; 	
				$("#citySearch").addClass("blur");					
				$("#citySearch").removeClass("focus");
			}
		})
		//A search without a working enter button is painful.
		$('#citySearch').keydown(function (e){
			if(e.keyCode == 13){
				loadWeatherData();
			}
		})
		//Initialize numDaysToForecast:
		if (document.getElementById("forecast0").checked) {
			numDaysToForecast = 0	
		}
		else if (document.getElementById("forecast5").checked){
			numDaysToForecast = 5
		}
		else{
			numDaysToForecast = 13	
		}
		//Keep them updated & the UI responsive by feeding them in as parameters to loadWeatherData.
		$("#forecast0").click( function(){
			loadWeatherData(0);
		})
		$("#forecast5").click( function(){
			loadWeatherData(4);
		})		
		$("#forecast14").click( function(){
			loadWeatherData(13);
		})
		//When a new favorite is selected, use it.
		$("#savedFavorites").change( function(){
			search.value = select.value;
			loadWeatherData();
		})
		$(".refresher").click( function(){
			loadWeatherData();
		})
		//Add favorites only if they are not already in the list and not the default search value.
		$("#addFavorite").click( function(){
			if(
			search.value !== search.defaultValue &&
			!($('#favoritesDiv option:contains("'+ toTitleCase(search.value) +'")').length > 0)
			){
				var option = document.createElement("option");
				option.text = toTitleCase(search.value);
				option.value = toTitleCase(search.value);
				select.add(option);				
				$(".chosen-select").trigger("chosen:updated");
			}
		})		
		$("#removeFavorite").click( function(){
			select.remove(select.selectedIndex);
			$(".chosen-select").trigger("chosen:updated");
		})
		//Allows the user to hide/show advanced settings.
		$("#settingsButton").click( function(){	
			if(settingsTab.className.indexOf("inactive") > -1){
				$("#settingsTab").removeClass("inactive");
			}
			else{
				settingsTab.className += " inactive";
			}
		})
	})		
	//Capitalizes the first letter of each word in a string.	
	function toTitleCase(str){
		if(str.charAt(0)){
			return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
		}
	}
	
	function loadGeoData() {
	// We need to check if the browser has the correct capabilities.
		textBox = document.getElementById("citySearch");
		//if there is text in the search we don't need to get geoData, as the user is trying to search.
		if (textBox.value !== textBox.defaultValue){
			loadWeatherData();
			return;
		}								
		if (debugLocation){
			$("#georesults").removeClass("inactive");
		}
		if (navigator.geolocation) {
			// If so, get the current position and feed it to exportPosition
			// (or errorPosition if there was a problem)
			navigator.geolocation.getCurrentPosition(exportPosition, errorPosition);
		} else {
			// If the browser isn't geo-capable, show if debugLocation enabled.
			document.getElementById("georesults").innerHTML = ('<p>Your browser does not support geolocation.</p>');
		}

		function errorPosition() {
			document.getElementById("georesults").innerHTML = ('<p>The page could not get your location.</p>');
		}

		function exportPosition(position) {									
			savedPosition = position;
			loadWeatherData(); //any time we want to refresh our position we'll also want to refresh the weather data.	
			if (debugLocation){ //show location details.
				document.getElementById("georesults").innerHTML = 
					'<div id="map_canvas"></div>' +
					'<p>' 
							+ 'Latitude: ' + position.coords.latitude + '<br />'
							+ 'Longitude: ' + position.coords.longitude + '<br />'
							+ 'Accuracy: ' + position.coords.accuracy + '<br />'
							+ 'Altitude: ' + position.coords.altitude + '<br />'
							+ 'Altitude accuracy: ' + position.coords.altitudeAccuracy + '<br />'
							+ 'Heading: ' + position.coords.heading + '<br />'
							+ 'Speed: ' + position.coords.speed + '<br />'
					+ '</p>'
				;					
				googleMapShow(
									position.coords.latitude,
									position.coords.longitude,
									{maximumAge:600000});
			}
		}
		
		function googleMapShow(latitude,longitude) {
			var latlng = new google.maps.LatLng(latitude, longitude);
			var myOptions = {
				zoom: 14,
				center: latlng,
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
		var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
		}
	}
						
	function loadWeatherData(){	
		if (arguments.length == 1 && typeof arguments[0] == 'number'){ //Allows numDaysToForecast to be fed in directly.
			numDaysToForecast = arguments[0];
		}
		else if (typeof arguments[0] != 'number'){
			var unusedArguments = "";
			for (i = 0 ; i <  arguments.length ; i++){
				unusedArguments += arguments[i];
			}
			console.error("loadWeatherData accepts only numbers. The following arguments are not used: " + unusedArguments);			
		}
		else if (arguments.length > 1){		
			var unusedArguments = "";
			for (i = 1 ; i <  arguments.length ; i++){
				unusedArguments += arguments[i];
			}
			console.error("loadWeatherData accepts at most 1 input. The following arguments are not used: " + unusedArguments);
		}
		var isUrlSet = false;
		setUrl();
		if(isUrlSet){
			var isCached = false;
			checkCache();
			if(!isCached){		
				//if our url is ready and the data is not already cached we ping the API for weather data.
				request.open('GET', url, true);
				request.onload = function() {
				  if (request.status >= 200 && request.status < 400) {
					// Success!
					weatherActive = JSON.parse(request.responseText);
					setCache(); //store the data and the url it corresponds to so we can check against it later
					showWeather(); //and display it.
				  } else {
					// We reached our target server, but it returned an error
					 document.getElementById("tempDisplay").innerHTML = "There was an error connecting to the weather server.";
				  }
				};
				request.onerror = function() {
				  // There was a connection error of some sort
				  document.getElementById("tempDisplay").innerHTML = "There was a connection error.";
				};			
				request.send();
			}
		}
		
		function setUrl(){ 
			var positionUrl = "";
			if (document.getElementById("degC").checked) {
				unitString = "metric";				
				unitDisplay = " °C";	
			}
			else {
				unitString = "imperial";		
				unitDisplay = " °F";	
			}			
			if (unitString !== "metric" && unitString !== "imperial"){
			//This will never evaluate to true in this incarnation, but may save headaches in the future.
				document.getElementById("tempDisplay").innerHTML = 'Something has gone wrong with temperature units, "' + unitString + '" is not valid.';
				$(".generated").remove();
				return;
			}
			if (!savedPosition.coords && textBox.value === textBox.defaultValue){
				document.getElementById("h01").innerHTML = "Please enter or share a location";		
				$(".generated").remove();
				return;
			}
			else if (textBox.value === textBox.defaultValue){ //use geolocation.
				positionUrl = "lat=" + savedPosition.coords.latitude + "&lon=" + savedPosition.coords.longitude;
			}
			else {
				positionUrl = "q=" + textBox.value + "&mode=json";
			}
			var unitsUrl = "&units=" + unitString;
			if (numDaysToForecast === 0) { //if we just want current weather go for it.
				url = "http://api.openweathermap.org/data/2.5/weather?" + positionUrl + unitsUrl + appIdString;
				isUrlSet = true;
			}
			else { //otherwise just grab the daily, and all 16 of them. We'll prune later.
				url = "http://api.openweathermap.org/data/2.5/forecast/daily?" + positionUrl + unitsUrl + "&cnt=16" + appIdString;	
				//This was returning 13 results when searching for 14 days sometimes when testing.
				isUrlSet = true;
			}
			if (debugUrl){
				document.getElementById("urlDiv").innerHTML = url;
				$("#urlDiv").removeClass("inactive");
			}
		}

		function setCache(){ //stores URL & weatherdata pairs.
			cachedWeather[cachedWeather.length] = {};
			cachedWeather[cachedWeather.length - 1].weather = weatherActive;
			cachedWeather[cachedWeather.length - 1].url = url;
			if (debugCache){alert(cachedWeather.length - 1 + " " + cachedWeather[cachedWeather.length - 1].url);}
		}
		
		function checkCache(){ //checks for url being cached and loads it if it is.
			for (i = 0; i < cachedWeather.length; i++){
				if (cachedWeather[i].url === url){				
					if (debugCache){alert(cachedWeather[i].url);}
					weatherActive = cachedWeather[i].weather;
					showWeather();
					isCached = true;
					return;
				}
			}
		}

		function showWeather(){				
			$(".generated").remove();					
			if(verifyResponse()) {
				if (numDaysToForecast === 0){
					displayCurrentWeather();
				}
				else{
					for (i = 0; i <= numDaysToForecast; i++){
						display1DayWeather(i);
					}
				}
			}				
		}
		
		function verifyResponse(){
			if (weatherActive.cod >= 200 && weatherActive.cod < 400 ){ 
				setHeadline();
				return true;						
			}
			else if (weatherActive.cod === "404"){
				document.getElementById("h01").innerHTML = "This city does not seem to exist. Please try again or share your location.";
				return false;
			}
			else {
				return false;
			}
		}
		
		function setHeadline(){			
			var startOfHeadline = "Weather in ";
			var search = document.getElementById("citySearch")
			var select = document.getElementById("savedFavorites")			
			var capsSearchString = toTitleCase(search.value); //Capitalize the user input to make it look nice.
			if (!savedPosition.coords && textBox.value === textBox.defaultValue){
				document.getElementById("h01").innerHTML = "Please enter or share a location";
				return;
			}
			if (numDaysToForecast === 0) {
				if (!weatherActive.name){ //if the search was not for a city, use the search text for the headline.
				//This is for cases like searching 'Wisconsin' in which case the API still accommodates the request
				//but there is no location name in the return.
					document.getElementById("h01").innerHTML = startOfHeadline + capsSearchString
				}
				else{
					document.getElementById("h01").innerHTML = startOfHeadline + weatherActive.name;
				}
			}
			else {//same as above only formatted to accept slightly different data structure for forecast data.
				if (!weatherActive.city.name){
					document.getElementById("h01").innerHTML = startOfHeadline + capsSearchString;						
				}
				else{
					document.getElementById("h01").innerHTML = startOfHeadline + weatherActive.city.name;
				}
			}
		}	
			
		function displayCurrentWeather(){				
			$("#weatherData").append (
			'<div class="weatherDay generated">' +
				'<div class="center day generated">'+ dayToday + '<br> </div>' +
				'<div class="center date generated">'+ (monthToday + 1) + '/' + dateToday  + '</div>' +
				'<div class="center temp generated">' + parseInt(weatherActive.main.temp, 10) + unitDisplay + '</div>' +
				'<div class="center description generated">' + weatherActive.weather[0].description + '</div>' +
			'</div>'
			);					
		}
		
		function display1DayWeather(dateIndex){ //A helper function to write an entire day's worth of weather data in HTML.
			date = new Date();
			date.setDate(date.getDate() + dateIndex);
			var temperature = weatherActive.list[dateIndex].temp;
			weatherActive.list[dateIndex].temp.avg = parseInt(
			(temperature.day + temperature.eve + temperature.morn + temperature.night) / 4
			, 10 );
			$("#weatherData").append (
			'<div class="weatherDay generated '+weatherActive.list[dateIndex].weather[0].main+'">' +
				'<div class="center day generated">'+ weekdays[date.getDay()] + '<br>' + '</div>' +
				'<div class="center date generated">' + (date.getMonth() + 1) +'/' + date.getDate() + '</div>' +
				'<div class="center temp generated">' + parseInt(weatherActive.list[dateIndex].temp.avg, 10) + unitDisplay + '</div>' +
				'<div class="center minmax generated">' +
					parseInt(weatherActive.list[dateIndex].temp.max, 10) + unitDisplay +
					' / ' + 
					parseInt(weatherActive.list[dateIndex].temp.min, 10) + unitDisplay +
				'</div>' +
				'<div class="center description generated">' + weatherActive.list[dateIndex].weather[0].main + '</div>' +
			'</div>'
			);
			if (i !== numDaysToForecast) {
				$("#weatherData").append ( 
				'<br class="generated">'
				)
			}
		}		
	}		
