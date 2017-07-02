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
 * Neural net score global var
 */
app.neuroScore = 0;

/**
 * Neural net score global var
 */
app.wearableState = 0;

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
 * Attach synaptic neural net components to app object
 */
app.Neuron = synaptic.Neuron;
app.Layer = synaptic.Layer;
app.Network = synaptic.Network;
app.Trainer = synaptic.Trainer;
app.Architect = synaptic.Architect;

app.neuralNet = new app.Architect.Perceptron(3,2,2,1);
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
			app.neuroScore = app.neuralNet.activate([ 
				values[2],
				values[3],
				values[4]]);

			/*************************** NOTIFY WEARABLE ****************************************/
			if(app.neuroScore > 0.90 && app.wearableState == 0 ) app.alertDetect(); //notify wearable change state to true) app.alertDetect();
			if(app.neuroScore < 0.70 && app.wearableState == 1 ) app.alertDetect(); //notify wearable change state to false) app.alertDetect();

			/**************************** TRAIN TRUE FOR ON TARGET ******************************/
			if(app.getTrueFlag){
				app.trainingDataTrue.push({
							input: [values[2], values[3], values[4] ],
							output: [1]
						});
				document.getElementById('score').innerHTML = "Neural Net Score: ....gathering true data";
				document.getElementById('numTrueData').innerHTML = app.trainingDataTrue.length + " True";
			}

			/**************************** TRAIN FALSE FOR OFF TARGET ******************************/
			else if(app.getFalseFlag){
				app.trainingDataFalse.push({
							input: [values[2], values[3], values[4] ],
							output: [0]
						});
				document.getElementById('score').innerHTML = "Neural Net Score: ....gathering false data";
				document.getElementById('numFalseData').innerHTML = app.trainingDataFalse.length + " False";
			}
			else if(app.trainingDataTrue.length > 3){document.getElementById('score').innerHTML = "Neural Net Score: " + app.neuroScore;}

			/********************************* TRAIN NEURAL NET ***********************************/
			if(app.trainFlag){

				app.showInfo('Status: Training...');
				console.log("**Training...");

				//Recreate neural net and trainer
				app.neuralNet = new app.Architect.Perceptron(3,2,2,1);
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

				if(app.wearableState == 0 && app.neuroScore > 0.90){  //send activate
					detect[0] = 5;
				} 

				if(app.wearableState == 1 && app.neuroScore < 0.70){   //send  deactivate
					detect[0] = 15;
				} 


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

			//if wearable alert is set to true from past session reset to false
			app.alertDetect;

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

	app.wearableState = evothings.util.littleEndianToUint8(data, 5); //device state of wearable

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
		else if(axis == 2){   //Accelerometer X axis
			diagramY = (255 - value) / 7 + (canvas.height - 35);
		}
		else if(axis == 3){ //Accelerometer Y axis
			diagramY = (102 - value) * 2 + (canvas.height / 5) + 0;
		}
		else if(axis == 4){ //Accelerometer Z axis
			diagramY = (102 - value) * 2 + (canvas.height / 5) + 15;
		}
		else if(axis == 5){ 
			diagramY = (102 - value) * 2 + (canvas.height / 5) + 30;
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


