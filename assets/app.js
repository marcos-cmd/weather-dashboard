const APIKey = "ec1592ece1e3f11400664da8b168ef05";
const lsKey = "weatherSearches"
const searchesEl = $("#searches");
const searchInput = $("#searchInput");
const searchBtn = $("#searchBtn");
const currentWeatherEl = $("#currentWeather");
const forecastEl = $("#forecast");
const clearBtn = $("#clear");
var storedSearches = getStoredSearches();
//variable used to store and determine if the city needs to be added to the search history
var addedCity = newCity();
//unit variables for future development of switching between unit systems.
const metricUnits = { deg: "C", speed: "KPH" };
const impUnits = { deg: "F", speed: "MPH" };
var units = metricUnits;


function init() {

    //enable tooltips
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
    });


    buildSearchHistory();

    if (storedSearches != null) {
        getWeather(storedSearches[0]);
    }

    searchInput.on("keyup", function (event) {
        // "13" represents the enter key
        if (event.key === "Enter") {
            searchBtnClicked();
        }
    });

    searchBtn.on("click", searchBtnClicked);
    clearBtn.on("click", clearSearches);
}

function buildSearchHistory() {

    searchesEl.empty();

    if (storedSearches != null) {
        storedSearches.forEach(element => {
            searchesEl.append(
                $("<button>")
                    .text(correctCase(element.city) + ", " + element.country.toUpperCase())
                    .addClass("btn btnCitySearch")
                    .on("click", function () {
                        getWeather(element);
                    })
            );
        });
    }
}

function searchBtnClicked() {

    let cityVal = searchInput.val().trim();
    let city = newCity(cityVal, null);
    getWeather(city);
    // delete the search value after the search is complete
    searchInput.val("");
}

function getWeather(city) {
    addedCity = city;
    let queryURLCurrent = "";
    let queryURLForecast = "";

    if (city.country == null) {
        queryURLCurrent = "https://api.openweathermap.org/data/2.5/weather?q=" + city.city + "&units=metric&appid=" + APIKey;
        queryURLForecast = "https://api.openweathermap.org/data/2.5/forecast?q=" + city.city + "&units=metric&appid=" + APIKey;
    } else {
        queryURLCurrent = "https://api.openweathermap.org/data/2.5/weather?q=" + city.city + "," + city.country + "&units=metric&appid=" + APIKey;
        queryURLForecast = "https:////api.openweathermap.org/data/2.5/forecast?q=" + city.city + "," + city.country + "&units=metric&appid=" + APIKey;
    }

    performAPIGETCall(queryURLCurrent, buildCurrentWeather);
    performAPIGETCall(queryURLForecast, buildForecastWeather);
}

function buildCurrentWeather(data) {
    //console.log(data);
    if (data != null) {
        console.log(units, metricUnits, data.wind.speed);
        currentWeatherEl.empty();
        currentWeatherEl.append(
            $("<h3>").text(correctCase(data.name) + ", "
                + data.sys.country.toUpperCase())
            , $("<h4>").text(moment.unix(data.dt).format("dddd, MMM Do YYYY"))
                .append($("<img>").attr("src", "https://openweathermap.org/img/wn/" + data.weather[0].icon + "@2x.png")
                    .addClass("currentWeatherImg")
                    .attr("data-toggle", "tooltip")
                    .attr("data-placement", "right")
                    .attr("title", data.weather[0].description)
                    .tooltip())
            , $("<p>").text("Temperature: " + Math.round(data.main.temp) + "°" + units.deg)
            , $("<p>").text("Humidity: " + data.main.humidity + "%")
            , $("<p>").text("Wind Speed: " + (Math.round((units === metricUnits) ? (data.wind.speed * 3.6) : data.wind.speed)) + " " + units.speed)
            , $("<p>").text("UV Index: ").append($("<div>").attr("id", "UVIndex"))
        );

        let UVqueryURL = "https://api.openweathermap.org/data/2.5/uvi?appid=" + APIKey + "&lat=" + data.coord.lat + "&lon=" + data.coord.lon;

        performAPIGETCall(UVqueryURL, buildUV);

        if (addedCity.country == null) {
            addedCity.country = data.sys.country;
            addedCity.city = data.name;
            addNewSearch(addedCity);
            addedCity = null;
        }

    } else {
        alert("Something went wrong getting current weather data, please try again");
    }
}

function buildUV(data) {
    if (data != null) {

        let UVIndex = data.value;
        let UVEl = $("#UVIndex").attr("data-toggle", "tooltip");
        let severity = "";
        let UVbg = null;
        let textColor = null;
        let borderColor = null;

        // Color scale for the UV index
        if (UVIndex < 2) {
            UVbg = "green";
            textColor = "white";
            severity = "Low";
            borderColor = "rgb(16, 129, 16)";
        } else if (UVIndex < 6) {
            UVbg = "yellow";
            severity = "Moderate";
            borderColor = "rgb(245, 245, 56)";
        } else if (UVIndex < 8) {
            UVbg = "orange";
            severity = "High";
            borderColor = "rgb(255, 184, 51)";
        } else if (UVIndex < 11) {
            UVbg = "red";
            textColor = "white";
            severity = "Very high";
            borderColor = "rgb(255, 54, 54)";
        } else {
            UVbg = "violet";
            severity = "Extreme";
            borderColor = "rgb(236, 151, 236)";
        }
        UVEl.attr("title", severity)
            .attr("data-placement", "right")
            .tooltip()
            .css("backgroundColor", UVbg)
            .css("borderColor", borderColor);

        if (textColor != null) {
            UVEl.css("color", textColor);
        }
        UVEl.text(UVIndex);
    } else {
        alert("Something went wrong getting UV data, please try again");
    }
}

function buildForecastWeather(data) {
    if (data != null) {

        forecastEl.empty();

        let dayCardContainer = $("<div>").attr("id", "dayCardContainer").addClass("row")

        forecastEl.append($("<h3>").text("5-Day Forecast:"), dayCardContainer);
        dailyData = parseDailyData(data);

        dailyData.forEach(element => {
            dayCardContainer.append(buildForecastCard(element));
        });

    } else {
        alert("Something went wrong getting forecast data, please try again");
    }
}
// 3 hour intervals are used
function parseDailyData(data) {

    let dailyData = [];
    // 8 * 3 hours is equivalent to one day
    for (var i = 5; i < data.list.length; i += 8) {

        let dataList = data.list[i];

        dailyData.push(newDay(dataList.dt,
            dataList.weather[0].icon,
            dataList.weather[0].description,
            dataList.main.temp,
            dataList.main.humidity));
    }
    return dailyData;
}

function buildForecastCard(day) {
    let dayCard = $("<div>").attr("class", "dayCard col-12 col-md-5 col-lg-2");

    dayCard.append(
        $("<label>").text(getDayOfWeek(day.date)),
        $("<label>").text(moment.unix(day.date).format("MMM Do YYYY")),
        $("<img>").attr("src", "https://openweathermap.org/img/wn/" + day.icon + ".png")
            .attr("data-toggle", "tooltip")
            .attr("data-placement", "right")
            .attr("title", day.description)
            .tooltip(),
        $("<p>").text("Temperature: " + Math.round(day.temp) + "°" + units.deg),
        $("<p>").text("Humidity: " + day.humidity + "%")
    );

    return dayCard;
}

function addNewSearch(city) {
    //console.log(city, storedSearches);
    if (storedSearches == null) {
        storedSearches = [];
    }
    //put the newest city at the top
    storedSearches.unshift(city);

    localStorage.setItem(lsKey, JSON.stringify(storedSearches));

    buildSearchHistory();
}

function clearSearches() {

    localStorage.removeItem(lsKey);
    searchesEl.empty();
    storedSearches = null;
}
// call initialize function
init();

//helper functions
function getDayOfWeek(date) {
    return moment.unix(parseInt(date)).format('dddd');
}

function correctCase(str) {
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

function getStoredSearches() {
    return JSON.parse(localStorage.getItem(lsKey));
}

function newCity(city, country) {
    return { city: city, country: country };
}

function performAPIGETCall(queryURL, callbackFunction) {
    $.ajax({ url: queryURL, method: "GET" }).then(function (response) {
        callbackFunction(response);
    });
}

function testFunction(mFunction, ...args) {
    console.log(mFunction(...args));
}

function newDay(date, icon, description, temp, humidity) {
    return { date: date, icon: icon, description: description, temp: temp, humidity: humidity };
}