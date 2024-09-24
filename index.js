import axios from "axios";
import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

var latitude;
var longitude;
app.get("/", async (req, res) => {
  try {
    res.render("index.ejs");
  } catch (error) {
    console.error("Failed to make request:", error.message);
    res.render("index.ejs");
  }
  //res.render("index.ejs");
});

app.post("/", async (req, res) => {
  try {
    var response = await axios.get(
      "https://geocoding-api.open-meteo.com/v1/search?name=" + req.body.text
    );
    const result = response.data;
    latitude = result.results[0].latitude;
    longitude = result.results[0].longitude;
    response = await axios.get(
      `https://api.open-meteo.com/v1/forecast/?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&current=relative_humidity_2m`
    );
    const current = response.data;
    response = await axios.get(
      `https://api.open-meteo.com/v1/forecast/?latitude=${latitude}&longitude=${longitude}&forecast_days=1&daily=precipitation_sum&daily=sunrise&daily=sunset&daily=daylight_duration&daily=wind_speed_10m_max&daily=uv_index_max`
    );
    const dailyParams = response.data;
    response = await axios.get(
      `https://api.open-meteo.com/v1/forecast/?latitude=${latitude}&longitude=${longitude}&forecast_days=2&hourly=temperature_2m&hourly=precipitation_probability&hourly=weather_code&hourly=weather_code&hourly=is_day`
    );
    const hourlyParams = response.data;
    response = await axios.get(
      `https://api.open-meteo.com/v1/forecast/?forecast_days=10&latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max&daily=temperature_2m_min&daily=weather_code`
    );
    var dailyConds = response.data;
    var tempsArr = GetFullDayNightArr(hourlyParams, "temperature_2m");
    var ConditionArr = GetFullDayNightArr(hourlyParams, "weather_code");
    var isDayArr = GetFullDayNightArr(hourlyParams, "is_day");
    var CurrTime = GetCurrentDataFormated().split("T")[1].split(":");
    var StringCondArr = ConditionsToString(ConditionArr);
    const now = new Date();
    const day = now.getDay();
    const daysArr = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    res.render("index.ejs", {
      cityName: result.results[0].name,
      currTemp: current.current.temperature_2m,
      precip: dailyParams.daily.precipitation_sum,
      sunrise: dailyParams.daily.sunrise,
      sunset: dailyParams.daily.sunset,
      dayslight: dailyParams.daily.daylight_duration,
      wind: dailyParams.daily.wind_speed_10m_max,
      uv: dailyParams.daily.uv_index_max,
      humidity: current.current.relative_humidity_2m,
      TempsArr24: tempsArr,
      CurrHours: parseInt(CurrTime[0]),
      CurrMinutes: CurrTime[1],
      WeatherCond: StringCondArr,
      isDay: isDayArr,
      DailyMinArr: dailyConds.daily.temperature_2m_min,
      DailyMaxArr: dailyConds.daily.temperature_2m_max,
      DailyWeatherCond: ConditionsToString(dailyConds.daily.weather_code),
      DayIndex: day,
      DaysArr: daysArr,
    });
  } catch (error) {
    console.error(error);
    console.log(req.body);
    res.render("index.ejs");
  }
});

app.listen(port, () => {
  console.log("Server is running on port " + port);
});

function GetCurrentDataFormated() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0"); // Month is zero-indexed, so add 1
  const day = String(currentDate.getDate()).padStart(2, "0");
  const hours = String(currentDate.getHours()).padStart(2, "0");
  const minutes = "00";
  const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
  return formattedDateTime;
}

function GetFullDayNightArr(data, param) {
  var timeIndex = data.hourly.time.findIndex(
    (obj) => obj == GetCurrentDataFormated()
  );
  var arr = [];
  var index = 0;
  for (var i = timeIndex; i < timeIndex + 24; i++) {
    arr[index] = data.hourly[param][i];
    index++;
  }
  return arr;
}
function ConditionsToString(intCond) {
  var stringCond = [];
  for (var i = 0; i < intCond.length; i++) {
    //console.log(intCond.length);
    switch (intCond[i]) {
      case 0:
        stringCond.push("Sunny");
        continue;
      case 1:
      case 2:
      case 3:
        stringCond.push("Partly cloudy");
        continue;
      case 45:
      case 48:
        stringCond.push("Foggy");
        continue;
      case 51:
      case 53:
      case 55:
      case 56:
      case 57:
        stringCond.push("Drizzle");
        continue;
      case 61:
      case 63:
      case 65:
      case 66:
      case 67:
        stringCond.push("Rain");
        continue;
      case 71:
      case 73:
      case 75:
      case 77:
        stringCond.push("Snow");
        continue;
      case 80:
      case 81:
      case 82:
        stringCond.push("Showers rain");
        continue;
      case 85:
      case 86:
        stringCond.push("Showers snow");
        continue;
      case 95:
      case 96:
      case 99:
        stringCond.push("Thunderstorm");
        continue;
      default:
        continue;
    }
  }
  return stringCond;
}
