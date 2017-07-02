
//alternate i2c pins   sda: 15   scl: 22

//NOTE: Thermopile values are now smoothed   (((Xt-2...)/2 + Xt-1)/2 + X)/2    6/14/17

/********************************************************************************************************/
/************************ INCLUDES **********************************************************************/
/********************************************************************************************************/
#include <SPI.h>
#include <Wire.h>
#include <BLEPeripheral.h>
#include <BLEUtil.h>
#include <MLP.h>
#include <Neurona.h>
#include <KX022.h>

/********************************************************************************************************/
/************************ CONSTANTS / SYSTEM VAR ********************************************************/
/********************************************************************************************************/
bool  debug = true;        //turn serial on/off to get data or turn up sample rate

/********************************************************************************************************/
/************************ DEFINITIONS *******************************************************************/
/********************************************************************************************************/

//#define PIN_SERIAL_RX           24
//#define PIN_SERIAL_TX           23

#define VIBRATE_PIN               25

//Accelerometer Pins
#define  SCL                      5
#define  SDA                      3
#define  KX022_SCL                5
#define  KX022_SDA                3
#define  KX022_INT                6
#define  KX022_ADDR               4
#define  KX022_NCS                7

//Accelerometer Addresses
//2A -> 0x54(w) 0x55(r)   2B -> 0x56(w)0x57(r)
#define KX022_addr_w              0x3C   //  0x3E    
#define KX022_addr_r              0x3D   //  0x3F   
#define KX022_Accel_CNTL1_1       0x18
#define KX022_Accel_CNTL1_2       0x41
#define KX022_Accel_ODCNTL_1      0x1B
#define KX022_Accel_ODCNTL_2      0x02
#define KX022_Accel_CNTL3_1       0x1A
#define KX022_Accel_CNTL3_2       0xD8
#define KX022_Accel_TILT_TIMER_1  0x22
#define KX022_Accel_TILT_TIMER_2  0x01
#define KX022_Accel_CNTL2_1       0x18
#define KX022_Accel_CNTL2_2       0xC1  
#define DATA_OUT_BASE             0x06 

//dummy LED pin for BLE
#define LED_PIN           3

//Neurona neural net implementation
#define NET_OUTPUTS       1
#define NET_INPUTS        3

/********************************************************************************************************/
/************************ VARIABLES *********************************************************************/
/********************************************************************************************************/
  //Time
  int   speedHz = 15;                 //default loop speed - native max loop speed is 62.5 ms or 16Hz
  float speedMs = (1/speedHz)*1000;   //native max loop speed is 62.5 ms or 16Hz

  //MLP (Multi Layer Perceptron) Neural Net
  int lastState=0, op=0;
  unsigned long pressTime = 0;
  int input[] = {0, 0, 0}; //RGB values
  double netInput[] = {-1.0, 0.0, 0.0, 0.0};
  int calib[3][2] = {{329, 778}, {166, 569}, {140, 528}};
  
  char *colors[] = {"BLACK", "RED", "GREEN", "BLUE", "YELLOW", "BROWN", "PURPLE", "ORANGE", "PINK", "WHITE"};
  
  int layerSizes[] = {6, NET_OUTPUTS, -1};
  int offset=0, iOffset=0, yOffset=0;
  double PROGMEM const initW[] = {2.753086,-11.472257,-3.311738,16.481226,19.507006,20.831778,7.113330,-6.423491,1.907215,6.495393,-27.712126,26.228203,-0.206367,-5.724560,-22.278070,30.065610,6.139262,-10.814282,28.513130,-9.784946,6.467021,0.055005,3.730361,4.145092,2.479019,0.013003,-3.582416,-16.364391,14.133357,-5.089288,1.637492,5.894826,1.415764,-3.315533,14.814289,-20.906571,-1.568656,1.917658,4.910184,4.039419,-10.848469,-5.641680,-4.132432,10.711442,3.759935,19.507702,17.728724,-3.210244,-2.476992,8.988450,5.196827,2.636043,17.357207,2.005429,11.713386,-5.453253,-6.940325,10.752005,0.666605,-7.266082,-3.587120,-9.921817,-12.682059,-15.456143,-13.740927,0.508265,15.179410,-11.143178,-19.085120,1.251235,22.006491,-4.227328,-0.444516,3.589025,0.649661,13.675598,-13.026884,-11.229070,-15.300703,-1.718191,6.737973,-28.176802,-2.505471,5.197970,7.007983,-2.869269,3.650349,18.029204,4.098356,10.481188,-2.566311,9.927770,2.344936,4.524327};

  //Targets
  float target_Tobj1, target_Tobj2, target_Tobj3, target_Tobj4, target_TobjAv, target_TambLow, target_time; 
  double target_pitch;
  double target_roll;
  uint8_t target_proximity;
  
  //Timestamp
    float clocktime;
    
  //Bluetooth
    unsigned long microsPerReading, microsPrevious;
    float accelScal;

  //System
  int varState = 0; //variable state controlled in app and appended to data stream
  
  //KX022 Accelerometer
    byte            rc;
    float           acc[3];
    double          pitch;
    double          roll;

/********************************************************************************************************/
/************************ DECLARATIONS ******************************************************************/
/********************************************************************************************************/
//Bluetooth
// create peripheral instance, see pinouts above
BLEPeripheral blePeripheral = BLEPeripheral();

// create service
//BLEService customService =    BLEService("FFFF");
BLEService customService =    BLEService("a000");

// create switch characteristic
BLECharCharacteristic    ReadOnlyArrayGattCharacteristic  = BLECharCharacteristic("a001", BLERead);
BLECharCharacteristic    WriteOnlyArrayGattCharacteristic = BLECharCharacteristic("a002", BLEWrite);

BLECharacteristic DataCharacteristic("a003", BLERead | BLENotify, 12);  //@param data - an Uint8Array.

//KX022 Accelerometer
KX022 kx022(KX022_DEVICE_ADDRESS_1E); 

/********* THIS DECLARATION IS FOR THE NEURONA LIBRARY ************/
//Use neurona to implement a neural net trained using synaptic.js on your app 
//Trained neural nets can be used on Nordic nRF52832 64Mhz microprocessors but training itself is too computationaly intensive
//MLP mlp(NET_INPUTS,NET_OUTPUTS,layerSizes,MLP::LOGISTIC,initW,true);


/********************************************************************************************************/
/************************ UTILITY FUNCTIONS *************************************************/
/********************************************************************************************************/
float differenceBetweenAngles(float firstAngle, float secondAngle)
  {
        double difference = secondAngle - firstAngle;
        while (difference < -180) difference += 360;
        while (difference > 180) difference -= 360;
        return difference;
 }

/********************************************************************************************************/
/************************ KX022 ACCELEROMETER FUNCTIONS *************************************************/
/********************************************************************************************************/

void initSensor(){
    writeTwoBytes(KX022_Accel_CNTL1_1,KX022_Accel_CNTL1_2); delay(1);
    writeTwoBytes(KX022_Accel_ODCNTL_1,KX022_Accel_ODCNTL_2); delay(1);
    writeTwoBytes(KX022_Accel_CNTL3_1,KX022_Accel_CNTL3_2); delay(1);
    writeTwoBytes(KX022_Accel_TILT_TIMER_1,KX022_Accel_TILT_TIMER_2); delay(1);
    writeTwoBytes(KX022_Accel_CNTL2_1,KX022_Accel_CNTL2_2); delay(1);
}

void writeTwoBytes (int one, int two)
{
    Wire.beginTransmission(KX022_addr_w); delay(1);
    Wire.write(one); delay(1);
    Wire.write(two); delay(1);
    Wire.endTransmission(); delay(1);
}

int getByte (int address)
{
  int readedValue;
  Wire.beginTransmission(KX022_addr_w); delay(1);
  Wire.write(address); delay(1);
  Wire.endTransmission(); delay(1);
  Wire.requestFrom(KX022_addr_r , 1); delay(1);  // Or-ed with "1" for read bit
  if(1 <= Wire.available())    // if two bytes were received
  {
    readedValue = Wire.read(); delay(1);
  }
  return readedValue;
}

float getAccel(int channelNum)
{
  return ((int16_t)((getByte(DATA_OUT_BASE+1 + 2*channelNum)<<8) | (getByte(DATA_OUT_BASE + 2*channelNum)))) / 16384.0;  
}

/********************************************************************************************************/
/************************ BLUETOOTH BLE FUNCTIONS *************************************************/
/********************************************************************************************************/
void blePeripheralConnectHandler(BLECentral& central) {
  // central connected event handler
if(debug){
  Serial.print(F("Connected event, central: "));
  Serial.println(central.address());
}
}

void blePeripheralDisconnectHandler(BLECentral& central) {
  // central disconnected event handler
if(debug){
  Serial.print(F("Disconnected event, central: "));
  Serial.println(central.address());
}
}

void blePeripheralServicesDiscoveredHandler(BLECentral& central) {
  // central  services discovered event handler
if(debug){
  Serial.print(F(" services discovered event, central: "));
  Serial.println(central.address());
}
/*
  if (ReadOnlyArrayGattCharacteristic.canRead()) {
    Serial.println(F("ReadOnlyArrayGattCharacteristic"));
    ReadOnlyArrayGattCharacteristic.read();
  }

  if (WriteOnlyArrayGattCharacteristic.canWrite()) {
    Serial.println(F("WriteOnlyArrayGattCharacteristic"));

   // unsigned long writeValue = 42;
    static uint8_t writeValue[10] = {0};
  //  writeValue[0] = 5;

    WriteOnlyArrayGattCharacteristic.write((const unsigned char*)&writeValue, sizeof(writeValue));
  } */
  delay(2000);
}

void bleCharacteristicValueUpdatedHandle(BLECentral& central, BLECharacteristic& characteristic) {
  const unsigned char* the_buffer = characteristic.value();
  unsigned char the_length = characteristic.valueLength();
 // char char_buf[2]={0,0};
  int command_value;
  
  String CardID = "";
  for (byte i = 0; i < the_length; i++){ CardID += String(the_buffer[i], HEX); }

  char *char_buf = const_cast<char*>(CardID.c_str());
  
  command_value = (int)strtol(char_buf, NULL, 16);
  
  if(debug) Serial.print("App command: "); Serial.println( command_value );

  //Process commands from app
  if(command_value < 9 && command_value != 0){
  /* removed */
  } else if(command_value < 10 || command_value == 0){
  /* removed */
  }else if(command_value >= 90 && command_value < 99){ 
      varState = command_value - 90; //user controlled variables from app
  }

  BLEUtil::printBuffer(characteristic.value(), characteristic.valueLength());
  if(debug) delay(1000);
  delay(100);
}

void switchCharacteristicWritten(BLECentral& central, BLECharacteristic& characteristic) {
  // central wrote new value to characteristic, update LED
  Serial.print(F("Characteristic event, writen: "));

  if (ReadOnlyArrayGattCharacteristic.value()) {
    if(debug) Serial.println(F("on"));
  } else {
    if(debug) Serial.println(F("off"));
  }
  delay(2000);
}

/********************************************************************************************************/
/************************ SETUP *************************************************************************/
/********************************************************************************************************/

void setup() 
{
      Serial.begin(115200);
    if(debug) Serial.print("starting\t");
    delay(50);
    
    //configure haptic feedback pin
    pinMode(VIBRATE_PIN, OUTPUT);  digitalWrite(VIBRATE_PIN, 0);
  
   //Configure KX022 Accelerometer pins
    pinMode(KX022_SCL, INPUT_PULLUP);
    pinMode(KX022_SDA, INPUT_PULLUP);
    //NCs select 1 for I2C
    pinMode(KX022_ADDR, OUTPUT);
    pinMode(KX022_NCS, OUTPUT);
    pinMode(KX022_INT, OUTPUT);
    digitalWrite(KX022_ADDR, 0);
    digitalWrite(KX022_NCS, 1);
    digitalWrite(KX022_INT, 1);

    Wire.begin();
    delay(50);
  
  /************ INIT KX022 ACCELEROMETER *****************************/
    kx022.init(); //library
    initSensor(); //bootstrap helper (doesn't provide real values)
    if(debug) Serial.println("kx022.init()");

  /************** INIT BLUETOOTH BLE instantiate BLE peripheral *********/
    // set LED pin to output mode
   // pinMode(LED_PIN, OUTPUT);
    // set advertised local name and service UUID
    blePeripheral.setLocalName("ChildMind");
    blePeripheral.setDeviceName("ChildMind");
    blePeripheral.setAdvertisedServiceUuid(customService.uuid());
    blePeripheral.setAppearance(0xFFFF);
  
    // add attributes (services, characteristics, descriptors) to peripheral
    blePeripheral.addAttribute(customService);
    blePeripheral.addAttribute(ReadOnlyArrayGattCharacteristic);
    blePeripheral.addAttribute(WriteOnlyArrayGattCharacteristic);
    blePeripheral.addAttribute(DataCharacteristic); //streaming data for app graph

    // assign event handlers for connected, disconnected to peripheral
    blePeripheral.setEventHandler(BLEConnected, blePeripheralConnectHandler);
    blePeripheral.setEventHandler(BLEDisconnected, blePeripheralDisconnectHandler);
  //blePeripheral.setEventHandler(BLEWritten, blePeripheralServicesDiscoveredHandler);

    // assign event handlers for characteristic
    ReadOnlyArrayGattCharacteristic.setEventHandler(BLEWritten /*BLEValueUpdated*/, bleCharacteristicValueUpdatedHandle);
    WriteOnlyArrayGattCharacteristic.setEventHandler(BLEWritten /*BLEValueUpdated*/, bleCharacteristicValueUpdatedHandle);

    // assign initial values
    char readValue[10] = {0,0,0,0,0,0,0,0,0,0};
    ReadOnlyArrayGattCharacteristic.setValue(0);
    char writeValue[10] = {0,0,0,0,0,0,0,0,0,0};
    WriteOnlyArrayGattCharacteristic.setValue(0);

    // initialize variables to pace updates to correct rate
    microsPerReading = 1000000 / 25;
    microsPrevious = micros();
  
    // begin initialization
    blePeripheral.begin();
  
    if(debug) Serial.println("BLE Mobile App Peripheral init");

    delay(500);   
}

/********************************************************************************************************/
/************************ LOOP **************************************************************************/
/********************************************************************************************************/

void loop()
{     
 /************************ LOOP SPEED CONTROL ***********************/
 if(clocktime + speedMs < millis()){
    
    /*************************** Timestamp ****************************/
    clocktime = millis();
    if(debug){
        Serial.print("Time: "); Serial.print( clocktime/1000 ); Serial.println(" s"); 
    }

   /******************* Bluetooth App  ********************/
    blePeripheral.poll();

   /******************* READ KX022 ACCELEROMETER *********************/
    rc = kx022.get_val(acc);
    if (rc == 0) {
        pitch = (180/3.141592) * ( atan2( acc[0], sqrt( acc[1] * acc[1] + acc[2] * acc[2])) );
        roll = (180/3.141592) * ( atan2(-acc[1], -acc[2]) );
        if(debug) Serial.print("Pitch: "); 
        if(debug) Serial.print(pitch); 
        if(debug) Serial.print("  Roll: "); 
        if(debug) Serial.println(roll);
    } 
    delay(5);

    //ALTERNATE READ HACK - need to get primary to work
    float tempX = float(getAccel(0) *10);

    if(debug){
      Serial.print("  accX: "); Serial.print( acc[0] ); Serial.println("F"); 
      Serial.print("  accY: "); Serial.print( acc[1] ); Serial.println("F"); 
      Serial.print("  accZ: "); Serial.print( acc[2] ); Serial.println("F"); 
    }

 
/*********** Bluetooth App  *******************/
    unsigned long microsNow;
    
    int roll_ble = roll;
    roll_ble = roll_ble + 180;
    
    int pitch_ble = pitch;
    pitch_ble = pitch_ble + 180;

    // check if it's time to read data and update the filter
    microsNow = micros();
    
    if(microsNow - microsPrevious >= microsPerReading){

          String strRoll = String(roll_ble);
          String strPitch = String(pitch_ble);
          String str = "filler9999999";

          if(debug){Serial.print("strPitch strRoll: "); Serial.print(strPitch); Serial.print(" "); Serial.println(strRoll);}
        
          BLECentral central = blePeripheral.central();
          
          if(central){ // if a central is connected to peripheral

              const unsigned char imuCharArray[12] = {
                  (uint8_t)roll_ble,
                  (uint8_t)pitch_ble,
                  (uint8_t)( (acc[0] + 1) * 100),
                  (uint8_t)( (acc[1] + 1) * 100),
                  (uint8_t)( (acc[2] + 1) * 100),
                  (uint8_t)str[5],
                  (uint8_t)str[6],
                  (uint8_t)str[7],
                  (uint8_t)str[8],
                  (uint8_t)str[9],
                  (uint8_t)str[10],
                  (uint8_t)str[11]
              };
 
              //send data over bluetooth
              DataCharacteristic.setValue(imuCharArray,12);
          }
  
          // increment previous time, so we keep proper pace
          microsPrevious = microsPrevious + microsPerReading;
        
     }

  } //end loop speed
} //end infinate loop
