/**
 * TreeSense AI — sensors.h
 * All sensor read functions for the ESP32 Smart Tree Node
 * Project: AI-Driven IoT Framework for Tree Behaviour Analysis
 */

#ifndef SENSORS_H
#define SENSORS_H

#include <DHT.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <MHZ19.h>
#include <TinyGPSPlus.h>
#include <SoftwareSerial.h>
#include "config.h"

// ── Sensor Data Structure ────────────────────────────────
struct SensorData {
  float    temperature;       // °C
  float    humidity;          // %RH
  float    pressure;          // hPa
  float    soilMoisturePct;   // 0–100%
  float    soilPH;            // 0–14
  uint16_t nitrogen;          // mg/kg
  uint16_t phosphorus;        // mg/kg
  uint16_t potassium;         // mg/kg
  uint16_t co2PPM;            // ppm
  uint16_t aqiValue;          // 0–500
  float    lightLux;          // lux
  float    tiltDegrees;       // °
  bool     isRaining;
  float    stemDistanceCM;    // cm (ultrasonic)
  float    barkTempC;         // °C (MLX90614)
  float    batteryVoltage;    // V
  uint32_t timestamp;
};

// ── Global Sensor Objects ───────────────────────────────
DHT             dht(DHT_PIN, DHT_TYPE);
Adafruit_BME280 bme;
BH1750          lightMeter;
Adafruit_MPU6050 mpu;
MHZ19           mhz19;
HardwareSerial  co2Serial(1);
HardwareSerial  npkSerial(2);
TinyGPSPlus     gps;
HardwareSerial  gpsSerial(0);

bool bmeOk = false, mpuOk = false, bh1750Ok = false;

// ── Initialize All Sensors ──────────────────────────────
bool initSensors() {
  bool allOk = true;

  dht.begin();
  Serial.println("[SENSOR] DHT22 initialized");

  bmeOk = bme.begin(BME280_I2C_ADDR);
  Serial.printf("[SENSOR] BME280: %s\n", bmeOk ? "OK" : "FAILED");
  if (!bmeOk) allOk = false;

  bh1750Ok = lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_I2C_ADDR);
  Serial.printf("[SENSOR] BH1750: %s\n", bh1750Ok ? "OK" : "FAILED");

  mpuOk = mpu.begin();
  Serial.printf("[SENSOR] MPU6050: %s\n", mpuOk ? "OK" : "FAILED");
  if (mpuOk) {
    mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
    mpu.setGyroRange(MPU6050_RANGE_250_DEG);
  }

  co2Serial.begin(CO2_BAUD, SERIAL_8N1, CO2_RX_PIN, CO2_TX_PIN);
  mhz19.begin(co2Serial);
  mhz19.autoCalibration(false);
  Serial.println("[SENSOR] MH-Z19 CO2 initialized");

  npkSerial.begin(NPK_BAUD, SERIAL_8N1, NPK_RX_PIN, NPK_TX_PIN);
  pinMode(NPK_DE_PIN, OUTPUT);
  Serial.println("[SENSOR] NPK RS485 initialized");

  pinMode(RAIN_SENSOR_PIN, INPUT_PULLUP);
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);

  return allOk;
}

// ── Read Soil Moisture ──────────────────────────────────
float readSoilMoisture() {
  int raw = analogRead(SOIL_MOISTURE_PIN);
  float pct = map(raw, SOIL_DRY_VALUE, SOIL_WET_VALUE, 0, 100);
  return constrain(pct, 0.0f, 100.0f);
}

// ── Read Soil pH ─────────────────────────────────────────
float readSoilPH() {
  int raw = analogRead(SOIL_PH_PIN);
  float voltage = (raw / 4095.0f) * 3.3f;
  float ph = 7.0f + ((2.5f - voltage) / 0.18f) + PH_OFFSET;
  return constrain(ph, 0.0f, 14.0f);
}

// ── Read NPK via RS485 ──────────────────────────────────
struct NPKData { uint16_t n, p, k; };

NPKData readNPK() {
  NPKData result = {0, 0, 0};
  byte cmd[] = {0x01, 0x03, 0x00, 0x1E, 0x00, 0x03, 0x65, 0xCD};
  
  digitalWrite(NPK_DE_PIN, HIGH);
  npkSerial.write(cmd, sizeof(cmd));
  npkSerial.flush();
  digitalWrite(NPK_DE_PIN, LOW);
  
  delay(500);
  if (npkSerial.available() >= 11) {
    byte resp[11];
    npkSerial.readBytes(resp, 11);
    result.n = (resp[3] << 8) | resp[4];
    result.p = (resp[5] << 8) | resp[6];
    result.k = (resp[7] << 8) | resp[8];
  }
  return result;
}

// ── Read CO₂ (MH-Z19) ───────────────────────────────────
uint16_t readCO2() {
  int co2 = mhz19.getCO2();
  return (co2 > 0 && co2 < 10000) ? (uint16_t)co2 : 400;
}

// ── Read Air Quality Index (MQ-135) ─────────────────────
uint16_t readAQI() {
  int raw = analogRead(AQI_PIN);
  // Simplified AQI mapping (calibrate for actual gas mix)
  float rs = ((4095.0f - raw) / raw) * AQI_RL_VALUE;
  float ppm = 116.6020682f * pow(rs / 10000.0f, -2.769034857f);
  return (uint16_t)constrain(ppm, 0, 500);
}

// ── Read Light (BH1750) ──────────────────────────────────
float readLight() {
  if (bh1750Ok) return lightMeter.readLightLevel();
  return 0.0f;
}

// ── Read Tilt (MPU-6050) ─────────────────────────────────
float readTiltDegrees() {
  if (!mpuOk) return 0.0f;
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  float tilt = atan2(sqrt(a.acceleration.x * a.acceleration.x +
                          a.acceleration.y * a.acceleration.y),
                     a.acceleration.z) * (180.0f / PI);
  return tilt;
}

// ── Read Rain Sensor ─────────────────────────────────────
bool readRain() {
  bool raw = digitalRead(RAIN_SENSOR_PIN);
  return RAIN_ACTIVE_LOW ? !raw : raw;
}

// ── Read Stem Distance (HC-SR04) ─────────────────────────
float readStemDistance() {
  digitalWrite(ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG, LOW);
  long duration = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);
  return duration * 0.0343f / 2.0f;
}

// ── Read Bark Temperature (MLX90614) ─────────────────────
float readBarkTemp() {
  // Requires Adafruit_MLX90614 library
  // Adafruit_MLX90614 mlx;
  // return mlx.readObjectTempC();
  return 28.5f; // Placeholder — wire up MLX90614 via I2C
}

// ── Read All Sensors into SensorData ────────────────────
bool readAllSensors(SensorData &data) {
  // Temperature & Humidity (DHT22 primary, BME280 fallback)
  data.temperature = dht.readTemperature();
  data.humidity    = dht.readHumidity();
  if (isnan(data.temperature) && bmeOk) {
    data.temperature = bme.readTemperature();
    data.humidity    = bme.readHumidity();
    data.pressure    = bme.readPressure() / 100.0f;
  } else {
    data.pressure = bmeOk ? bme.readPressure() / 100.0f : 1013.25f;
  }

  if (isnan(data.temperature)) {
    Serial.println("[SENSOR] ERROR: Temperature read failed");
    data.temperature = -999.0f;
  }

  // Soil sensors
  data.soilMoisturePct = readSoilMoisture();
  data.soilPH          = readSoilPH();

  // NPK
  NPKData npk      = readNPK();
  data.nitrogen    = npk.n;
  data.phosphorus  = npk.p;
  data.potassium   = npk.k;

  // Atmosphere
  data.co2PPM      = readCO2();
  data.aqiValue    = readAQI();
  data.lightLux    = readLight();

  // Physical
  data.tiltDegrees  = readTiltDegrees();
  data.isRaining    = readRain();
  data.stemDistanceCM = readStemDistance();
  data.barkTempC    = readBarkTemp();

  return (data.temperature > -998.0f);
}

// ── GPS Update ───────────────────────────────────────────
bool updateGPSCoordinates(float &lat, float &lon, uint8_t timeoutSec) {
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  uint32_t start = millis();
  while (millis() - start < (uint32_t)timeoutSec * 1000) {
    while (gpsSerial.available()) gps.encode(gpsSerial.read());
    if (gps.location.isValid() && gps.location.isUpdated()) {
      lat = gps.location.lat();
      lon = gps.location.lng();
      Serial.printf("[GPS] Fix: %.6f, %.6f\n", lat, lon);
      return true;
    }
  }
  Serial.println("[GPS] No fix within timeout");
  return false;
}

#endif // SENSORS_H
