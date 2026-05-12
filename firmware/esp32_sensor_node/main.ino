/**
 * TreeSense AI — ESP32 Smart Tree Sensor Node
 * Main Firmware (main.ino)
 * Project: AI-Driven IoT Framework for Tree Behaviour Analysis
 * Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0 | May 2026
 *
 * Required Libraries (install via Arduino Library Manager):
 *   DHT sensor library (Adafruit)
 *   Adafruit BME280
 *   BH1750 (claws)
 *   Adafruit MPU6050
 *   MHZ19 (WifWaf)
 *   TinyGPS++ (mikalhart)
 *   LoRa (Sandeep Mistry)
 *   PubSubClient (Nick O'Leary)
 *   ArduinoJson (Benoit Blanchon)
 *   SD (Arduino)
 *   EEPROM (Arduino)
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LoRa.h>
#include <Wire.h>
#include <SPI.h>
#include <EEPROM.h>
#include <SD.h>
#include <esp_sleep.h>

#include "config.h"
#include "sensors.h"
#include "mqtt_client.h"
#include "lora_comm.h"

// ─────────────────────────────────────────────────────────
//  Global Objects
// ─────────────────────────────────────────────────────────
WiFiClient        wifiClient;
PubSubClient      mqttClient(wifiClient);
SensorData        currentReading;
char              treeID[24]  = "TBA-RGU-0000";
float             gpsLat      = 0.0f;
float             gpsLon      = 0.0f;
uint32_t          bootCount   = 0;
RTC_DATA_ATTR uint32_t sleepCount = 0;  // Persists across deep sleep

// ─────────────────────────────────────────────────────────
//  Forward Declarations
// ─────────────────────────────────────────────────────────
void     loadDeviceIdentity();
void     connectWiFi();
void     publishSensorData();
void     publishHeartbeat();
void     checkAlerts(SensorData &data);
void     saveToSDBuffer(SensorData &data);
void     flushSDBuffer();
void     handleMQTTMessage(char* topic, byte* payload, unsigned int length);
void     enterDeepSleep();
float    readBatteryVoltage();
void     printDebugInfo(SensorData &data);

// ─────────────────────────────────────────────────────────
//  SETUP
// ─────────────────────────────────────────────────────────
void setup() {
  Serial.begin(SERIAL_BAUD);
  EEPROM.begin(EEPROM_SIZE);
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  
  sleepCount++;
  Serial.printf("\n[TREESENSE] Boot #%u | Firmware v%s\n", sleepCount, FIRMWARE_VERSION);

  // Load tree identity from EEPROM
  loadDeviceIdentity();
  Serial.printf("[ID] Tree ID: %s | Lat: %.6f | Lon: %.6f\n", treeID, gpsLat, gpsLon);

  // Initialize SD card for buffering
  if (SD.begin(SD_CS_PIN)) {
    Serial.println("[SD] Card initialized");
  } else {
    Serial.println("[SD] Card not found — offline buffer disabled");
  }

  // Initialize all sensors
  if (!initSensors()) {
    Serial.println("[SENSOR] Warning: some sensors failed to initialize");
  }

  // Read GPS if first boot or every 12 hours
  if (sleepCount == 1 || sleepCount % 144 == 0) {
    updateGPSCoordinates(gpsLat, gpsLon, GPS_FIX_TIMEOUT_S);
    EEPROM.put(EEPROM_LAT_ADDR, gpsLat);
    EEPROM.put(EEPROM_LON_ADDR, gpsLon);
    EEPROM.commit();
  }

  // Read all sensors
  if (!readAllSensors(currentReading)) {
    Serial.println("[SENSOR] Critical read failure — saving to buffer");
    saveToSDBuffer(currentReading);
    enterDeepSleep();
    return;
  }

  currentReading.timestamp = millis();
  currentReading.batteryVoltage = readBatteryVoltage();

  if (DEBUG_MODE) printDebugInfo(currentReading);
  checkAlerts(currentReading);

  // ─── Try WiFi → MQTT ───
  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    mqttClient.setServer(MQTT_BROKER_IP, MQTT_PORT);
    mqttClient.setCallback(handleMQTTMessage);
    
    if (connectMQTT(mqttClient, treeID)) {
      publishSensorData();
      if (sleepCount % 3 == 0) publishHeartbeat();  // Every 15 min
      flushSDBuffer();  // Upload any cached data
    } else {
      Serial.println("[MQTT] Connection failed — using LoRa fallback");
      sendViaLoRa(currentReading, treeID, gpsLat, gpsLon);
      saveToSDBuffer(currentReading);
    }
    WiFi.disconnect(true);
  } else {
    // ─── Fallback: LoRa ───
    Serial.println("[WiFi] Not connected — using LoRa");
    sendViaLoRa(currentReading, treeID, gpsLat, gpsLon);
    saveToSDBuffer(currentReading);
  }

  enterDeepSleep();
}

void loop() {
  // Not used — device runs on deep sleep cycles
}

// ─────────────────────────────────────────────────────────
//  Load Device Identity from EEPROM
// ─────────────────────────────────────────────────────────
void loadDeviceIdentity() {
  char storedID[24];
  EEPROM.get(EEPROM_TREE_ID_ADDR, storedID);
  if (storedID[0] != 0xFF && strlen(storedID) > 3) {
    strncpy(treeID, storedID, sizeof(treeID));
  }
  EEPROM.get(EEPROM_LAT_ADDR, gpsLat);
  EEPROM.get(EEPROM_LON_ADDR, gpsLon);
  if (isnan(gpsLat)) gpsLat = 0.0f;
  if (isnan(gpsLon)) gpsLon = 0.0f;
}

// ─────────────────────────────────────────────────────────
//  Connect to WiFi
// ─────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    delay(200);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] Timeout");
  }
}

// ─────────────────────────────────────────────────────────
//  Publish Sensor Data via MQTT
// ─────────────────────────────────────────────────────────
void publishSensorData() {
  StaticJsonDocument<512> doc;
  doc["tree_id"]       = treeID;
  doc["ts"]            = sleepCount * DEEP_SLEEP_DURATION_S;
  doc["lat"]           = gpsLat;
  doc["lon"]           = gpsLon;
  doc["temperature"]   = currentReading.temperature;
  doc["humidity"]      = currentReading.humidity;
  doc["pressure"]      = currentReading.pressure;
  doc["soil_moisture"] = currentReading.soilMoisturePct;
  doc["soil_ph"]       = currentReading.soilPH;
  doc["nitrogen"]      = currentReading.nitrogen;
  doc["phosphorus"]    = currentReading.phosphorus;
  doc["potassium"]     = currentReading.potassium;
  doc["co2_ppm"]       = currentReading.co2PPM;
  doc["aqi"]           = currentReading.aqiValue;
  doc["lux"]           = currentReading.lightLux;
  doc["tilt_deg"]      = currentReading.tiltDegrees;
  doc["rain"]          = currentReading.isRaining;
  doc["stem_dist_cm"]  = currentReading.stemDistanceCM;
  doc["bark_temp_c"]   = currentReading.barkTempC;
  doc["battery_v"]     = currentReading.batteryVoltage;

  char topic[64];
  snprintf(topic, sizeof(topic), "treesense/%s/sensors", treeID);
  char payload[512];
  serializeJson(doc, payload);
  
  mqttClient.publish(topic, payload, true);
  Serial.printf("[MQTT] Published to %s\n", topic);
}

// ─────────────────────────────────────────────────────────
//  Publish Heartbeat
// ─────────────────────────────────────────────────────────
void publishHeartbeat() {
  StaticJsonDocument<128> doc;
  doc["tree_id"] = treeID;
  doc["fw"]      = FIRMWARE_VERSION;
  doc["uptime"]  = sleepCount * DEEP_SLEEP_DURATION_S;
  doc["bat_v"]   = currentReading.batteryVoltage;
  doc["rssi"]    = WiFi.RSSI();

  char topic[64], payload[128];
  snprintf(topic, sizeof(topic), "treesense/%s/heartbeat", treeID);
  serializeJson(doc, payload);
  mqttClient.publish(topic, payload);
}

// ─────────────────────────────────────────────────────────
//  Check Alert Thresholds
// ─────────────────────────────────────────────────────────
void checkAlerts(SensorData &data) {
  StaticJsonDocument<256> alert;
  bool hasAlert = false;

  if (data.temperature > TEMP_HIGH_ALERT_C) {
    alert["high_temp"] = data.temperature;
    hasAlert = true;
  }
  if (data.soilMoisturePct < SOIL_MOISTURE_LOW_PCT) {
    alert["low_soil_moisture"] = data.soilMoisturePct;
    hasAlert = true;
  }
  if (data.co2PPM > CO2_HIGH_ALERT_PPM) {
    alert["high_co2"] = data.co2PPM;
    hasAlert = true;
  }
  if (data.tiltDegrees > TILT_ALERT_DEG) {
    alert["tilt"] = data.tiltDegrees;
    hasAlert = true;
  }
  if (data.soilPH < PH_LOW_ALERT || data.soilPH > PH_HIGH_ALERT) {
    alert["ph_out_of_range"] = data.soilPH;
    hasAlert = true;
  }

  if (hasAlert && WiFi.status() == WL_CONNECTED && mqttClient.connected()) {
    alert["tree_id"] = treeID;
    alert["severity"] = "WARNING";
    char topic[64], payload[256];
    snprintf(topic, sizeof(topic), "treesense/%s/alert", treeID);
    serializeJson(alert, payload);
    mqttClient.publish(topic, payload, true);
    Serial.printf("[ALERT] Published: %s\n", payload);
  }
}

// ─────────────────────────────────────────────────────────
//  Save to SD Card (offline buffer)
// ─────────────────────────────────────────────────────────
void saveToSDBuffer(SensorData &data) {
  File logFile = SD.open(SD_LOG_FILE, FILE_APPEND);
  if (logFile) {
    StaticJsonDocument<512> doc;
    doc["tree_id"]       = treeID;
    doc["ts"]            = sleepCount * DEEP_SLEEP_DURATION_S;
    doc["temperature"]   = data.temperature;
    doc["humidity"]      = data.humidity;
    doc["soil_moisture"] = data.soilMoisturePct;
    doc["co2_ppm"]       = data.co2PPM;
    doc["battery_v"]     = data.batteryVoltage;
    serializeJson(doc, logFile);
    logFile.println();
    logFile.close();
    Serial.println("[SD] Data buffered locally");
  }
}

// ─────────────────────────────────────────────────────────
//  Flush SD Buffer to Cloud
// ─────────────────────────────────────────────────────────
void flushSDBuffer() {
  File logFile = SD.open(SD_LOG_FILE, FILE_READ);
  if (!logFile || logFile.size() == 0) return;
  
  char topic[64];
  snprintf(topic, sizeof(topic), "treesense/%s/sensors", treeID);
  int flushed = 0;
  
  while (logFile.available() && flushed < 50) {
    String line = logFile.readStringUntil('\n');
    if (line.length() > 5) {
      mqttClient.publish(topic, line.c_str());
      flushed++;
      delay(100);
    }
  }
  logFile.close();
  if (flushed > 0) {
    SD.remove(SD_LOG_FILE);
    Serial.printf("[SD] Flushed %d buffered records\n", flushed);
  }
}

// ─────────────────────────────────────────────────────────
//  MQTT Message Handler (receive commands)
// ─────────────────────────────────────────────────────────
void handleMQTTMessage(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.printf("[MQTT] Received on %s: %s\n", topic, msg.c_str());

  StaticJsonDocument<256> cmd;
  if (deserializeJson(cmd, msg) == DeserializationError::Ok) {
    if (cmd.containsKey("sleep_interval_s")) {
      // Dynamic sleep interval update
      uint32_t newSleep = cmd["sleep_interval_s"];
      Serial.printf("[CMD] Sleep interval updated to %us\n", newSleep);
      // Store to EEPROM and apply on next cycle
    }
  }
}

// ─────────────────────────────────────────────────────────
//  Read Battery Voltage
// ─────────────────────────────────────────────────────────
float readBatteryVoltage() {
  int raw = analogRead(BATTERY_ADC_PIN);
  float voltage = (raw / 4095.0f) * 3.3f * 2.0f; // 2:1 divider
  return voltage;
}

// ─────────────────────────────────────────────────────────
//  Print Debug Info to Serial
// ─────────────────────────────────────────────────────────
void printDebugInfo(SensorData &data) {
  Serial.println("─────────────────────────────────────");
  Serial.printf("  Tree ID     : %s\n", treeID);
  Serial.printf("  Location    : %.6f, %.6f\n", gpsLat, gpsLon);
  Serial.printf("  Temperature : %.1f °C\n", data.temperature);
  Serial.printf("  Humidity    : %.1f %%\n", data.humidity);
  Serial.printf("  Pressure    : %.1f hPa\n", data.pressure);
  Serial.printf("  Soil Moist  : %.1f %%\n", data.soilMoisturePct);
  Serial.printf("  Soil pH     : %.2f\n", data.soilPH);
  Serial.printf("  N/P/K       : %d/%d/%d mg/kg\n", data.nitrogen, data.phosphorus, data.potassium);
  Serial.printf("  CO2         : %d ppm\n", data.co2PPM);
  Serial.printf("  AQI         : %d\n", data.aqiValue);
  Serial.printf("  Light       : %.0f lux\n", data.lightLux);
  Serial.printf("  Tilt        : %.1f °\n", data.tiltDegrees);
  Serial.printf("  Rain        : %s\n", data.isRaining ? "YES" : "NO");
  Serial.printf("  Bark Temp   : %.1f °C\n", data.barkTempC);
  Serial.printf("  Battery     : %.2f V\n", data.batteryVoltage);
  Serial.println("─────────────────────────────────────");
}

// ─────────────────────────────────────────────────────────
//  Enter Deep Sleep
// ─────────────────────────────────────────────────────────
void enterDeepSleep() {
  float battV = readBatteryVoltage();
  uint64_t sleepUS = (uint64_t)DEEP_SLEEP_DURATION_S * 1000000ULL;
  
  if (battV < CRITICAL_BATTERY_V) {
    sleepUS *= 6; // Sleep 6x longer to conserve battery
    Serial.printf("[POWER] Critical battery (%.2fV) — extended sleep\n", battV);
  }
  
  Serial.printf("[SLEEP] Entering deep sleep for %llu seconds\n", sleepUS / 1000000ULL);
  Serial.flush();
  esp_deep_sleep(sleepUS);
}
