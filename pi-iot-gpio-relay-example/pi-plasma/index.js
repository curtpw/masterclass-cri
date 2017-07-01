var bleno = require('bleno');
var util = require('util');
var express = require('express');
var path = require('path');
var config = require('./config');
var async = require('async');
var gpio = require('pi-gpio');

//GPIO

function delayPinWrite(pin, value, callback) {
  setTimeout(function() {
    gpio.write(pin, value, callback);
  }, config.RELAY_TIMEOUT);
}

/*
app.post("/api/garage/left", function(req, res) {
  async.series([
    function(callback) {
      // Open pin for output
      gpio.open(config.LEFT_GARAGE_PIN, "output", callback);
    },
    function(callback) {
      // Turn the relay on
      gpio.write(config.LEFT_GARAGE_PIN, config.RELAY_ON, callback);
    },
    function(callback) {
      // Turn the relay off after delay to simulate button press
      delayPinWrite(config.LEFT_GARAGE_PIN, config.RELAY_OFF, callback);
    },
    function(err, results) {
      setTimeout(function() {
        // Close pin from further writing
        gpio.close(config.LEFT_GARAGE_PIN);
        // Return json
        res.json("ok");
      }, config.RELAY_TIMEOUT);
    }
  ]);
});

app.post("/api/garage/right", function(req, res) {
  async.series([
    function(callback) {
      // Open pin for output
      gpio.open(config.RIGHT_GARAGE_PIN, "output", callback);
    },
    function(callback) {
      // Turn the relay on
      gpio.write(config.RIGHT_GARAGE_PIN, config.RELAY_ON, callback);
    },
    function(callback) {
      // Turn the relay off after delay to simulate button press
      delayPinWrite(config.RIGHT_GARAGE_PIN, config.RELAY_OFF, callback);
    },
    function(err, results) {
      setTimeout(function() {
        // Close pin from further writing
        gpio.close(config.RIGHT_GARAGE_PIN);
        // Return json
        res.json("ok");
      }, config.RELAY_TIMEOUT);
    }
  ]);
});

app.post("/api/garage/both", function(req, res) {
  async.series([
    function(callback) {
      // Open pin for output
      gpio.open(config.LEFT_GARAGE_PIN, "output", callback);
    },
    function(callback) {
      // Open pin for output
      gpio.open(config.RIGHT_GARAGE_PIN, "output", callback);
    },
    function(callback) {
      // Turn the relay on
      gpio.write(config.LEFT_GARAGE_PIN, config.RELAY_ON, callback);
    },
    function(callback) {
      // Turn the relay on
      gpio.write(config.RIGHT_GARAGE_PIN, config.RELAY_ON, callback);
    },
    function(callback) {
      // Turn the relay off after delay to simulate button press
      delayPinWrite(config.LEFT_GARAGE_PIN, config.RELAY_OFF, callback);
    },
    function(callback) {
      // Turn the relay off after delay to simulate button press
      delayPinWrite(config.RIGHT_GARAGE_PIN, config.RELAY_OFF, callback);
    },
    function(err, results) {
      setTimeout(function() {
        // Close pin from further writing
        gpio.close(config.LEFT_GARAGE_PIN);
        gpio.close(config.RIGHT_GARAGE_PIN);
        // Return json
        res.json("ok");
      }, config.RELAY_TIMEOUT);
    }
  ]);
});
*/

//Bluetooth

var BlenoPrimaryService = bleno.PrimaryService;

var EchoCharacteristic = require('./characteristic');

console.log('bleno - echo');

bleno.on('stateChange', function(state) {
  console.log('on -> stateChange: ' + state);

  if (state === 'poweredOn') {
    bleno.startAdvertising(bleno.name, [systemInformationService.uuid]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', function(error) {
  console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

  if (!error) {
    bleno.setServices([
      new BlenoPrimaryService({
        uuid: 'ff51b30e-d7e2-4d93-8842-a7c4a57dfb07',
        characteristics: [
          new EchoCharacteristic()
        ]
      })
    ]);
  }
});
