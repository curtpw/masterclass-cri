/*
Description: streaming sensor data to neural net example

*/

/**
 * Object that holds application data and functions.
 */
var app = {};

/**
 * Name of device to connect to.
 */
app.deviceName = 'ChildMind'

/**
 * Nueral net control flags
 */
app.getTrueFlag = false;
app.getFalseFlag = false;
app.trainFlag = false;

/**
 * Stores data user input data marker state  0 = false/false , 1 = true/false , 2 = false/true , 3 = true/true 
 */
app.varState = 0;

/**
 * Connected device.
 */
app.device = null;

/**
 * Object that holds wearable device UUIDs.
 */
app.deviceUUID = {};

// UUIDs for movement services and characteristics.
app.deviceUUID.PRIMARY_SERVICE = '0000a000-0000-1000-8000-00805f9b34fb';
app.deviceUUID.MOVEMENT_DATA = '0000a003-0000-1000-8000-00805f9b34fb';
//app.wearabledevice.MOVEMENT_CONFIG = 'f000aa82-0451-4000-b000-000000000000';
//app.wearabledevice.MOVEMENT_PERIOD = 'f000aa83-0451-4000-b000-000000000000';
//app.wearabledevice.MOVEMENT_NOTIFICATION = '00002902-0000-1000-8000-00805f9b34fb';

/**
 * Data that is plotted on the canvas.
 */
app.dataPoints = [];

/**
 * Object that holds wearable device UUIDs.
 */
app.wearabledevice = {};

/**
 * Set of Training data
 */
app.trainingDataTrue = [];
app.trainingDataFalse = [];

/**
 * Arrays that hold sensor values for gesture targets
 */
 /*
var rollTargets=[0,0,0,0,0,0,0,0,0];
var pitchTargets=[0,0,0,0,0,0,0,0,0];
var proximityTargets=[0,0,0,0,0,0,0,0,0];
var thermo1Targets=[0,0,0,0,0,0,0,0,0];
var thermo2Targets=[0,0,0,0,0,0,0,0,0];
var thermo3Targets=[0,0,0,0,0,0,0,0,0];
var thermo4Targets=[0,0,0,0,0,0,0,0,0];
*/

/**
 * Attach synaptic neural net components to app object
 */
app.Neuron = synaptic.Neuron;
app.Layer = synaptic.Layer;
app.Network = synaptic.Network;
app.Trainer = synaptic.Trainer;
app.Architect = synaptic.Architect;

app.neuralNet = new app.Architect.Perceptron(8,7,6,1);
app.trainer = new app.Trainer(app.neuralNet);

/**
 * Initialise the application.
 */
app.initialize = function()
{
	document.addEventListener(
		'deviceready',
		function() { evothings.scriptsLoaded(app.onDeviceReady) },
		false);

	initializeAWS(); //get reasy to stream data to AWS with Lambda and DynamoDB

	//Initial neural net bias training
/*	app.trainer.train([
			{
				input: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
				output: [0]
			},
			{
				input: [0.6, 0.6, 0.1, 0.85, 0.85, 0.85, 0.85],
				output: [1]
			},
		],{
			rate: .5,
			iterations: 50,
			error: .1,
			shuffle: true,
			log: 1000,
			cost: app.Trainer.cost.CROSS_ENTROPY
	}); */

	// Called when HTML page has been loaded.
	$(document).ready( function()
	{
		// Adjust canvas size when browser resizes
		$(window).resize(app.respondCanvas);

		// Adjust the canvas size when the document has loaded.
		app.respondCanvas();
	});
};

/**
 * Read device sensor data.
 */
app.startSensorDataStream = function(device)
{
	app.showInfo('Status: Starting data stream...');

	//Create MLP (Multi Layer Perceptron) synaptic neural net object
/*	var Neuron = synaptic.Neuron,
	Layer = synaptic.Layer,
	Network = synaptic.Network,
	Trainer = synaptic.Trainer,
	Architect = synaptic.Architect;

	var neuralNet = new Architect.Perceptron(7,9,9,1);
	var trainer = new Trainer(neuralNet); */

	//dummer train to get things rolling
/*	trainer.train([
			{
				input: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
				output: [0]
			},
			{
				input: [0.6, 0.6, 0.1, 0.85, 0.85, 0.85, 0.85],
				output: [1]
			},
		],{
			rate: .5,
			iterations: 50,
			error: .1,
			shuffle: true,
			log: 1000,
			cost: Trainer.cost.CROSS_ENTROPY
	});*/

	//To apply neural net: value = neuralNet.activate([a,b,c,d,e,f,g,h]);

	// Start accelerometer notification.
	device.enableNotification(
		app.deviceUUID.MOVEMENT_DATA,
		function(data)
		{
			app.showInfo('Status: Data stream active');
			var dataArray = new Uint8Array(data);
		//	console.log(dataArray);// debug

			//parse data from sensors
			var values = app.getAccelerometerValues(dataArray);  //return [roll, pitch, proximity, thermo1, thermo2, thermo3, thermo4, accelX, accelY, accelZ];

			/*************************** APPLY MLP NEURAL NET ***********************************/
			var neuroScore = app.neuralNet.activate([ 
				(values[7]/200),
				(values[8]/200),
				(values[9]/200),
				(values[2]/255),
				(values[3]/102),
				(values[4]/102),
				(values[5]/102),
				(values[6]/102)]);

			if(neuroScore > 0.95) app.alertDetect();

			/**************************** TRAIN TRUE FOR ON TARGET ******************************/
			if(app.getTrueFlag){
				app.trainingDataTrue.push({
							input: [(values[7]/200), (values[8]/200), (values[9]/200), (values[2]/255), (values[3]/102), (values[4]/102), (values[5]/102), (values[6]/102)],
							output: [1]
						});
				document.getElementById('score').innerHTML = "Neural Net Score: " + neuroScore + " ..gathering True";
				document.getElementById('numTrueData').innerHTML = app.trainingDataTrue.length + " True";
			}

			/**************************** TRAIN FALSE FOR OFF TARGET ******************************/
			else if(app.getFalseFlag){
				app.trainingDataFalse.push({
							input: [(values[7]/200), (values[8]/200), (values[9]/200), (values[2]/255), (values[3]/102), (values[4]/102), (values[5]/102), (values[6]/102)],
							output: [0]
						});
				document.getElementById('score').innerHTML = "Neural Net Score: " + neuroScore + " ..gathering False";
				document.getElementById('numFalseData').innerHTML = app.trainingDataFalse.length + " False";
			}
			else{document.getElementById('score').innerHTML = "Neural Net Score: " + neuroScore;}

			/********************************* TRAIN NEURAL NET ***********************************/
			if(app.trainFlag){

				app.showInfo('Status: Training...');
				console.log("**Training...");

				//Recreate neural net and trainer
				app.neuralNet = new app.Architect.Perceptron(8,7,6,1);
				app.trainer = new app.Trainer(app.neuralNet);

				var trainingData = app.trainingDataTrue.concat(app.trainingDataFalse);

				app.trainer.train(trainingData,{
									rate: .05,
									iterations: 5000,
									error: .05,
									shuffle: true,
									log: 1000,
									cost: app.Trainer.cost.CROSS_ENTROPY
				});	
				app.showInfo('Status: Training Completed');
				console.log("**End Training...");

				app.trainFlag = false;
			}


			//graph data in app UI
			app.drawDiagram(values);
		},
		function(errorCode)
		{
			console.log('Error: enableNotification: ' + errorCode + '.');
		});
};

app.alertDetect = function()
{
		app.device.readCharacteristic(
		'0000a001-0000-1000-8000-00805f9b34fb',
		function(data)
		{
			var view = new Uint8Array(data);

			var detect = new Uint8Array(1);

				detect[0] = 1;

				app.device.writeCharacteristic(
					'0000a002-0000-1000-8000-00805f9b34fb',
					detect,
					function() { console.log('Detection sent successfully!') },
					function(error) { console.log('Detection send failed: ' + error) }
				);

		},
		function(error)
		{
			console.log('Error: Read characteristic failed: ' + error);
		});
}


/**
 * Adjust the canvas dimensions based on its container's dimensions.
 */
app.respondCanvas = function()
{
	var canvas = $('#canvas')
	var container = $(canvas).parent()
	canvas.attr('width', $(container).width() ) // Max width
	// Not used: canvas.attr('height', $(container).height() ) // Max height
};

/**
 * When low level initialization complete, this function is called.
 */
app.onDeviceReady = function()
{
	// Report status.
	app.showInfo('Enter BLE device name and tap Connect');

	// Show the saved device name, if any.
	var name = localStorage.getItem('deviceName');
	if (name)
	{
		app.deviceName = name;
	}
	$('#deviceName').val(app.deviceName);
};

/**
 * Print debug info to console and application UI.
 */
app.showInfo = function(info)
{
	document.getElementById('info').innerHTML = info;
	console.log(info);
};

/**
 * Scan for device and connect.
 */
app.startScan = function()
{
	evothings.easyble.startScan(
		function(device)
		{
			// Do not show un-named devices.
			var deviceName = device.advertisementData ?
				device.advertisementData.kCBAdvDataLocalName : null
			if (!device.name) { return }

			// Print "name : mac address" for every device found.
			console.log(device.name + ' : ' + device.address.toString().split(':').join(''))

			// If my device is found connect to it.
			if (device.hasName(app.deviceName))
			{
				app.showInfo('Status: Device found: ' + deviceName);
				evothings.easyble.stopScan();
				app.connectToDevice(device);
			}
		},
		function(error)
		{
			app.showInfo('Error: startScan: ' + error);
		});
};

/**
 * Read services for a device.
 */
app.connectToDevice = function(device)
{
	app.showInfo('Status: Connecting...');
	device.connect(
		function(device)
		{
			app.device = device;
			app.showInfo('Status: Connected');
			app.readServices(app.device);

			//Start data streaming and graphing after device connection
			app.startSensorDataStream();
		},
		function(errorCode)
		{
			app.showInfo('Error: Connection failed: ' + errorCode);
		});
};

/**
 * Dump all information on named device to the console
 */
app.readServices = function(device)
{
	// Read all services.
	device.readServices(
		null,
		function()
		{
			console.log("readServices success");

			// Debug logging of all services, characteristics and descriptors
			// reported by the BLE board.
			app.logAllServices(app.device);
		},
		function(error)
		{
			console.log('Error: Failed to read services: ' + error);
		});
};

/**
 * when low level initialization complete,
 * this function is called
 */
app.onConnectButton = function()
{
	console.log("app.onConnectButton");
	// Get device name from text field.
	app.deviceName = $('#deviceName').val();

	// Save it for next time we use the app.
	localStorage.setItem('deviceName', app.deviceName);

	// Call stop before you start, just in case something else is running.
	evothings.easyble.stopScan();
	evothings.easyble.closeConnectedDevices();

	// Only report devices once.
	evothings.easyble.reportDeviceOnce(true);

	// Start scanning.
	app.startScan();
	app.showInfo('Status: Scanning...');

	$("#numTargets").text("0 Targets");

};

/**
 * Gather neural net training data for true condition - when on target
 */
app.onTrainButton = function()
{
	console.log("app.onTrainButton");
	app.trainFlag = true;
};

/**
 * Gather neural net training data for true condition - when on target
 */
app.onGetTrueButton = function()
{
	console.log("app.onGetTrueButton");
	$("#getTrueButton").toggleClass("green"); 
	$("#getTrueButton").toggleClass("hardIndigo"); 

	app.getTrueFlag = !app.getTrueFlag;
};

/**
 * Gather neural net training data for false condition - when off target
 */
app.onGetFalseButton = function()
{
	console.log("app.onGetFalseButton");
	$("#getFalseButton").toggleClass("green"); 
	$("#getFalseButton").toggleClass("hardIndigo"); 

	app.getFalseFlag = !app.getFalseFlag;
};

/**
 * Clear True Training set
 */
app.onClearTrueButton = function()
{
	console.log("app.onClearTrueButton");
	app.trainingDataTrue = [];
	document.getElementById('numTrueData').innerHTML = "0 True";
};

/**
 * Clear True Training set
 */
app.onClearFalseButton = function()
{
	console.log("app.onClearFalseButton");
	app.trainingDataFalse = [];
	document.getElementById('numFalseData').innerHTML = "0 False";
};

/**
 * Gather neural net training data for true condition - when on target
 */
/*app.onClearButton = function()
{
	app.device.readCharacteristic(
		'0000a001-0000-1000-8000-00805f9b34fb',
		function(data)
		{
			var view = new Uint8Array(data);
			var target = new Uint8Array(1);
			app.totalTargets = 0;
			target[0] = app.totalTargets;
			$("#numTargets").text("0 Targets");

			app.device.writeCharacteristic(
				'0000a002-0000-1000-8000-00805f9b34fb',
				target,
				function() { console.log('Targets cleared successfully!') },
				function(error) { console.log('Target clear failed: ' + error) });

		},
		function(error)
		{
			console.log('Error: Read characteristic failed: ' + error);
		}
	);

	console.log("clear targets");
	for(var d=0;d<rollTargets.length;d++){
		rollTargets[d]=0;
		pitchTargets[d]=0;
		proximityTargets[d]=0;
		thermo1Targets[d]=0;
		thermo2Targets[d]=0;
		thermo3Targets[d]=0;
		thermo4Targets[d]=0;
	}
}; */

/*app.onVarButton = function(buttonNum)
{
	app.device.readCharacteristic(
		'0000a001-0000-1000-8000-00805f9b34fb',
		function(data)
		{
			// app.varState stores data user input data marker state  0 = false/false , 1 = true/false , 2 = false/true , 3 = true/true 
			if(buttonNum == 1 && app.varState == 0) app.varState = 1;
			else if(buttonNum == 1 && app.varState == 1) app.varState = 0;
			else if(buttonNum == 1 && app.varState == 2) app.varState = 3;
			else if(buttonNum == 1 && app.varState == 3) app.varState = 2;
			else if(buttonNum == 2 && app.varState == 0) app.varState = 2;
			else if(buttonNum == 2 && app.varState == 1) app.varState = 3;
			else if(buttonNum == 2 && app.varState == 2) app.varState = 0;
			else if(buttonNum == 2 && app.varState == 3) app.varState = 2;


			var view = new Uint8Array(data);
			var sendVar = new Uint8Array(1);

			//add 90 to differentiate from target values which use same BLE characteristic for comms
			sendVar[0] = app.varState + 90;


		//	$("#numTargets").text("0 Targets");

			if(buttonNum == 1) { $("#alphaButton").toggleClass("green"); $("#alphaButton").toggleClass("hardIndigo"); }
			if(buttonNum == 2) { $("#betaButton").toggleClass("green"); $("#betaButton").toggleClass("hardIndigo"); }

			app.device.writeCharacteristic(
				'0000a002-0000-1000-8000-00805f9b34fb',
				sendVar,
				function() { console.log('Var update sent successfully!') },
				function(error) { console.log('Var update failed: ' + error) });

		},
		function(error)
		{
			console.log('Error: Read characteristic failed: ' + error);
		});
};*/

/**
 * Debug logging of found services, characteristics and descriptors.
 */
app.logAllServices = function(device)
{
	// Here we simply print found services, characteristics,
	// and descriptors to the debug console in Evothings Workbench.

	// Notice that the fields prefixed with "__" are arrays that
	// contain services, characteristics and notifications found
	// in the call to device.readServices().

	// Print all services.
	console.log('Found services:');
	for (var serviceUUID in device.__services)
	{
		var service = device.__services[serviceUUID];
		console.log('  service: ' + service.uuid);

		// Print all characteristics for service.
		for (var characteristicUUID in service.__characteristics)
		{
			var characteristic = service.__characteristics[characteristicUUID];
			console.log('    characteristic: ' + characteristic.uuid);

			// Print all descriptors for characteristic.
			for (var descriptorUUID in characteristic.__descriptors)
			{
				var descriptor = characteristic.__descriptors[descriptorUUID];
				console.log('      descriptor: ' + descriptor.uuid);
			}
		}
	}
};

/**
 * Data streaming and graphing on/off.
 */
/*app.onGraphButton = function()
{
	$("#graphButton").toggleClass("green"); $("#graphButton").toggleClass("indigo");
	app.startSensorDataStream();
}*/

app.readServices = function(device)
{
	device.readServices(
		[
		app.deviceUUID.PRIMARY_SERVICE // Movement service UUID.
		],
		// Function that monitors accelerometer data.
		app.startSensorDataStream,
		function(errorCode)
		{
			console.log('Error: Failed to read services: ' + errorCode + '.');
		});
};



/**
 * Calculate accelerometer values from raw data for wearabledevice 2.
 * @param data - an Uint8Array.
 * @return Object with fields: x, y, z.
 */
app.getAccelerometerValues = function(data)
{

	//Parse data
	var roll 		= evothings.util.littleEndianToUint8(data, 0);
	var pitch 		= evothings.util.littleEndianToUint8(data, 1);
	var accelX	 	= evothings.util.littleEndianToUint8(data, 2);
	var accelY	 	= evothings.util.littleEndianToUint8(data, 3);
	var accelZ	 	= evothings.util.littleEndianToUint8(data, 4);

	// Return result.
	return [roll, pitch, accelX, accelY, accelZ];
};

/**
 * Plot diagram of sensor values.
 * Values plotted are expected to be between -1 and 1
 * and in the form of objects with fields x, y, z.
 */
app.drawDiagram = function(values)
{
//	console.log("in draw diagram");
	var canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');

	$(".senseVal.rollVal").text("Roll: " + values[0]);
	$(".senseVal.pitchVal").text("Pitch: " + values[1]);
	$(".senseVal.xVal").text("X: " + values[2]);
	$(".senseVal.yVal").text("Y: " + values[3]);
	$(".senseVal.zVal").text("Z: " + values[4]);

	// Add recent values.
	app.dataPoints.push(values);

	// Remove data points that do not fit the canvas.
	if (app.dataPoints.length > canvas.width)
	{
		app.dataPoints.splice(0, (app.dataPoints.length - canvas.width));
	}

	// Value is an accelerometer reading between -1 and 1.
	function calcDiagramY(value, axis)
	{
	//	console.log("in drawLine calcDiagramY");
		// Return Y coordinate for this value.
		var diagramY;
	//	var diagramY = (( (1 / value) * canvas.height) / 2) + (canvas.height / 2);
		if(axis == 0){  //angular
			diagramY = (value) / 6 + 10/* (canvas.height / 7)*/;
		}
		else if(axis == 1){  //angular
			diagramY = (value) / 6 + 20/*(canvas.height / 7)*/;
		}
		else if(axis == 2){   //proximity
			diagramY = (255 - value) / 7 + (canvas.height - 35);
		}
		else if(axis == 3){ //thermopiles
			diagramY = (102 - value) * 2 + (canvas.height / 5) + 0;
		}
		else if(axis == 4){ //thermopiles
			diagramY = (102 - value) * 2 + (canvas.height / 5) + 15;
		}
		else if(axis == 5){ //thermopiles
			diagramY = (102 - value) * 2 + (canvas.height / 5) + 30;
		}
		else if(axis == 6){ //thermopiles
			diagramY = (102 - value) * 2 + (canvas.height / 5) + 45;
		}
		//var diagramY = value / 2;

		return diagramY;
	}

	function drawLine(axis, color)
	{
	//	console.log("in drawLine");
		context.beginPath();
		context.strokeStyle = color;
		context.setLineDash([]); //no more dashed lines

		var lastDiagramY = calcDiagramY(app.dataPoints[app.dataPoints.length-1][axis], axis);
			context.moveTo(app.dataPoints.length - 2, lastDiagramY);

		var x = 1;
		for (var i = app.dataPoints.length - 2; i >= 0; i--)
		{
			var y = calcDiagramY(app.dataPoints[i][axis], axis);
			context.lineTo(i, y); 
			x++;
		}

		context.stroke();

		//draw horizontal dashed lines for targets
		if(app.totalTargets > 0){
			context.beginPath();
			context.strokeStyle = color;
			context.setLineDash([3, 5]);/*dashes are 5px and spaces are 3px*/
			var targetY;
			for(var t=0; t<app.totalTargets; t++){
					if(axis == 0) 	   targetY = calcDiagramY(rollTargets[t], axis); 	
					else if(axis == 1) targetY = calcDiagramY(pitchTargets[t], axis); 	
					else if(axis == 2) targetY = calcDiagramY(proximityTargets[t], axis); 
					else if(axis == 3) targetY = calcDiagramY(thermo1Targets[t], axis); 	
					else if(axis == 4) targetY = calcDiagramY(thermo2Targets[t], axis); 	
					else if(axis == 5) targetY = calcDiagramY(thermo3Targets[t], axis); 	
					else if(axis == 6) targetY = calcDiagramY(thermo4Targets[t], axis); 	
					context.moveTo(0, targetY);
					context.lineTo(canvas.width, targetY);
				//	console.log("Sensor index: " + axis + " Target Y val: " + targetY);
			}
			context.stroke();
		}
		
		
	}

	// Clear background.
	context.clearRect(0, 0, canvas.width, canvas.height);

	// Draw lines.
	drawLine(0, '#00f');
	drawLine(1, '#855723');
	drawLine(2, '#b99c6b');
	drawLine(3, '#8f3b1b');
	drawLine(4, '#d57500');

};

function mergeObjects(obj, src) {
    Object.keys(src).forEach(function(key) { obj[key] = src[key]; });
    return obj;
}

// Initialize the app.
app.initialize();


