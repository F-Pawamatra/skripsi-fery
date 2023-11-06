document.addEventListener("DOMContentLoaded", connect);

const homeBtn = document.querySelectorAll(".icon__home");
const activityBtn = document.querySelectorAll(".icon__activity");
const personalBtn = document.querySelectorAll(".icon__account");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const todaysArrow = document.getElementById("todays_arrow");
const todaysHomeArrow = document.getElementById("arrow__icon");

var armcircles = 0;
var pushups = 0;
var situps = 0;
var squats = 0;
var duration = 0;
var weight = 0;

var startTime;

$(document).ready(function () {
  $("#home").show();
  $("#daily__activity").hide();
  $("#current__activity").hide();
  $("#day__activity").hide();
  $("#personal").hide();
});

todaysArrow.addEventListener("click", (event) => {
  $("#daily__activity").show();
  $("#home").hide();
  $("#current__activity").hide();
  $("#day__activity").hide();
  $("#personal").hide();
});
todaysHomeArrow.addEventListener("click", (event) => {
  $("#home").show();
  $("#daily__activity").hide();
  $("#current__activity").hide();
  $("#day__activity").hide();
  $("#personal").hide();
});
homeBtn.forEach((el) =>
  el.addEventListener("click", (event) => {
    $("#home").show();
    $("#daily__activity").hide();
    $("#current__activity").hide();
    $("#day__activity").hide();
    $("#personal").hide();
    $("#current__info").hide();
  })
);

activityBtn.forEach((el) =>
  el.addEventListener("click", (event) => {
    $("#daily__activity").show();
    $("#home").hide();
    $("#current__activity").hide();
    $("#day__activity").hide();
    $("#personal").hide();
  })
);

personalBtn.forEach((el) =>
  el.addEventListener("click", (event) => {
    $("#personal").show();
    $("#daily__activity").hide();
    $("#home").hide();
    $("#current__activity").hide();
    $("#day__activity").hide();
  })
);

startBtn.addEventListener("click", (event) => {
  $("#home").hide();
  $("#daily__activity").hide();
  $("#current__activity").show();
  $("#day__activity").hide();
});

stopBtn.addEventListener("click", (event) => {
  $("#home").hide();
  $("#current__activity").hide();
  $("#daily__activity").show();
  $("#day__activity").hide();
});

function showDayActivity(day) {
  var DayCountRef = firebase.database().ref(day + "/exercise");
  DayCountRef.on("value", (snapshot) => {
    var data = snapshot.val();
    Object.keys(data).forEach(function eachKey(key) {
      const exercise_key = "#day__" + key + "__count";
      const exercise_value = data[key][key];
      $(exercise_key).text(exercise_value);
      window[key] = exercise_value;
    });

    $("#day__duration__count").text(
      parseFloat(window.duration / 1000).toFixed(0) + "s"
    );

    let totalExercise =
      window.armcircles + window.pushups + window.situps + window.squats;
    let calories = (((totalExercise * 1.5) / 60) * 3.8 * 3.5 * weight) / 200;

    calories = parseFloat(calories).toFixed(2);
    $("#day__calories__count").text(calories);
  });

  day = day.charAt(0).toUpperCase() + day.slice(1);
  $("#day_name").html(day + " Activity <label> Stats</label>");
  $("#home").hide();
  $("#current__activity").hide();
  $("#daily__activity").hide();
  $("#day__activity").show();
}

globalThis.showDayActivity = showDayActivity;

//----------Bluetooth-------------------------//
var bluetoothDevice;

var exerciseValue;
var startValue;
var stopValue;
var resetValue;

var characteristicVar;
var myDevice

function connect() {
  var state = true;
  navigator.bluetooth
    .getDevices()
    .then((devices) => {
      for (const device of devices) {
        console.log("  > " + device.name + " (" + device.id + ")");
        if (
          device.name == "Pita-Pintar" ||
          device.name == "Arduino" ||
          device.id == "e2D6KSLwZCC8CzY+W+5FjA=="
        ) {
          state = false;
          connectToBluetoothDevice(device);
        }
      }
    })
    .catch((error) => {
      log("Argh! " + error);
    });
}

function connectToBluetoothDevice(device) {
  let serviceUuid = "e267751a-ae76-11eb-8529-0242ac130003";
  if (serviceUuid.startsWith("0x")) {
    serviceUuid = parseInt(serviceUuid);
  }

  const abortController = new AbortController();

  myDevice = device;
  device.addEventListener(
    "advertisementreceived",
    (event) => {
      console.log('> Received advertisement from "' + device.name + '"...');

      abortController.abort();
      console.log('Connecting to GATT Server from "' + device.name + '"...');
      return device.gatt
        .connect()
        .then((server) => {
          console.log("Getting Service...");
          return server.getPrimaryService(serviceUuid);
        })
        .then((service) => {
          console.log("Getting Characteristic...");
          return service.getCharacteristics();
        })
        .then((characteristic) => {
          characteristicVar = characteristic;
          exerciseValue = characteristic[0];
          startValue = characteristic[1];
          stopValue = characteristic[2];
          resetValue = characteristic[3];
          $("#ble_status").text("Connected");
        })

        .catch((error) => {
          console.log("Argh! " + error);
          $("#ble_status").text("Error!")
        });
    },
    { once: true }
  );

  console.log('Watching advertisements from "' + device.name + '"...');
  device
    .watchAdvertisements({ signal: abortController.signal })
    .catch((error) => {
      console.log("Argh! " + error);
    });
}

function requestDevice() {
  let serviceUuid = "e267751a-ae76-11eb-8529-0242ac130003";
  if (serviceUuid.startsWith("0x")) {
    serviceUuid = parseInt(serviceUuid);
  }

  let characteristicUuid = "00002a19-0000-1000-8000-00805f9b34fb";
  if (characteristicUuid.startsWith("0x")) {
    characteristicUuid = parseInt(characteristicUuid);
  }

  navigator.bluetooth
    .requestDevice({ filters: [{ services: [serviceUuid] }] })
    .then((device) => {
      console.log("Chosen device: " + device.name);
      return connect();
    });
}

globalThis.requestDevice = requestDevice;

function start() {
  console.log(characteristicVar);
  $("#lds-ripple").show();
  myDevice.gatt.connect();
  var arr = new Int8Array([21, 31]);
  return startValue.writeValueWithResponse(arr).then((response) => {
    console.log(exerciseValue);
    return exerciseValue.startNotifications().then((_) => {
      console.log("> Notifications started");
      exerciseValue.addEventListener(
        "characteristicvaluechanged",
        handleNotifications
      );
      startTime = Date.now();
      $("#lds-ripple").hide();
      $("#exercise").text("");
      $("#current__info").show();
      $("#count").text("IDLE");
    });
  });
}

globalThis.start = start;

function handleNotifications(event) {
  let value = event.target.value.getInt8();
  console.log(value);
  if (value == 0) {
    armcircles = armcircles + 1;
    firebase
      .database()
      .ref(today + "/exercise/armcircles")
      .update({
        armcircles: parseInt(armcircles),
      });
  } else if (value == 1) {
    pushups = pushups + 1;
    firebase
      .database()
      .ref(today + "/exercise/pushups")
      .update({
        pushups: parseInt(pushups),
      });
  } else if (value == 2) {
    situps = situps + 1;
    firebase
      .database()
      .ref(today + "/exercise/situps")
      .update({
        situps: parseInt(situps),
      });
  } else if (value == 3) {
    squats = squats + 1;
    firebase
      .database()
      .ref(today + "/exercise/squats")
      .update({
        squats: parseInt(squats),
      });
  }
}

function stop() {
  console.log(characteristicVar);
  myDevice.gatt.connect();
  var stopTime = Date.now();
  duration = stopTime - startTime;

  firebase
    .database()
    .ref(today + "/exercise/duration")
    .update({
      duration: firebase.database.ServerValue.increment(duration),
    });

  $("#current__info").hide();

  let durationInSec = parseFloat(duration / 1000).toFixed(0);
  $("#duration__count").text(durationInSec + "s");

  var arr = new Int8Array([21, 31]);

  return stopValue.writeValueWithResponse(arr).then((response) => {
    return exerciseValue
      .stopNotifications()
      .then((_) => {
        console.log();
      })
      .catch((error) => {
        console.log("Argh! " + error);
      });
  });
}

globalThis.stop = stop;

function reset() {
  var arr = new Int8Array([21, 31]);
  return resetValue.writeValueWithResponse(arr).then((response) => {
    console.log();
  });
}

//----------Firebase------------------------//
const d = new Date();
let day = d.getDay();
const weekday = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};
const today = weekday[day];

const firebaseConfig = {
  apiKey: "firebase-api-key",
  authDomain: "firebase-auth-domain",
  databaseURL: "firebase-database-url",
  projectId: "firebase-project-id",
  storageBucket: "firebase-storage-bucket",
  messagingSenderId: "firebase-messaging-sender-id",
  appId: "firebase-app-id",
  measurementId: "firebase-measurement-id",
};

firebase.initializeApp(firebaseConfig);

var nameRef = firebase.database().ref("personal/name");
nameRef.on("value", (snapshot) => {
  const data = snapshot.val();
  $("#name_value").val(data);
  $("#hello_name_value").text(data);
});

var genderRef = firebase.database().ref("personal/gender");
genderRef.on("value", (snapshot) => {
  const data = snapshot.val();
  $("#gender_value").val(data);
});

var weightRef = firebase.database().ref("personal/weight");
weightRef.on("value", (snapshot) => {
  const data = snapshot.val();
  weight = data;
  $("#weight_value").val(data);
});

var heightRef = firebase.database().ref("personal/height");
heightRef.on("value", (snapshot) => {
  const data = snapshot.val();
  $("#height_value").val(data);
});

var CountRef = firebase.database().ref(today + "/exercise");
CountRef.on("child_changed", (snapshot) => {
  const data = snapshot.val();
  let exercise = Object.keys(data)[0];
  let count = data[exercise];
  $("#lds-ripple").hide();
  $("#current__info").show();
  $("#exercise").text(exercise.toUpperCase());
  $("#count").text(count);
});

CountRef.on("value", (snapshot) => {
  var data = snapshot.val();
  Object.keys(data).forEach(function eachKey(key) {
    const exercise_key = "#" + key + "__count";
    const exercise_key_today = "#todays_" + key;
    const exercise_value = data[key][key];
    $(exercise_key).text(exercise_value);
    $(exercise_key_today).text(exercise_value);
    window[key] = exercise_value;
  });

  let durationInSec = parseFloat(window.duration / 1000).toFixed(0);
  let totalExercise =
    window.armcircles + window.pushups + window.situps + window.squats;
  let calories = (((totalExercise * 1.5) / 60) * 3.8 * 3.5 * weight) / 200;
  calories = parseFloat(calories).toFixed(2);

  $("#todays_calories").text(calories);
  $("#todays_duration").text(durationInSec + "s");

  $("#calories__count").text(calories);
  $("#duration__count").text(durationInSec + "s");
});

function submit() {
  var personalRef = firebase.database().ref("/personal");
  var name = $("#name_value").val();
  var gender = $("#gender_value").val();
  var weight = $("#weight_value").val();
  var height = $("#height_value").val();
  personalRef.set({
    name: name,
    gender: gender,
    weight: weight,
    height: height,
  });
  $("#home").show();
  $("#daily__activity").hide();
  $("#current__activity").hide();
  $("#day__activity").hide();
  $("#personal").hide();
}

globalThis.submit = submit;
