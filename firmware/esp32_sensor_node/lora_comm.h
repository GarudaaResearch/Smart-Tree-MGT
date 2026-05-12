/**
 * TreeSense AI — lora_comm.h
 * LoRa SX1276 Communication Layer for ESP32 Node
 * Handles packet building, fragmentation, and transmission
 */

#ifndef LORA_COMM_H
#define LORA_COMM_H

#include <LoRa.h>
#include <ArduinoJson.h>
#include "config.h"
#include "sensors.h"

// Packet types
#define LORA_PKT_SENSOR    0x01
#define LORA_PKT_ALERT     0x02
#define LORA_PKT_HEARTBEAT 0x03
#define LORA_PKT_IMAGE     0x04

bool initLoRa() {
  LoRa.setPins(LORA_SS_PIN, LORA_RST_PIN, LORA_DIO0_PIN);
  if (!LoRa.begin(LORA_FREQUENCY)) {
    Serial.println("[LoRa] Init FAILED");
    return false;
  }
  LoRa.setSpreadingFactor(LORA_SPREADING);
  LoRa.setSignalBandwidth(LORA_BANDWIDTH);
  LoRa.setCodingRate4(LORA_CODING_RATE - 4);
  LoRa.setTxPower(LORA_TX_POWER);
  LoRa.setSyncWord(LORA_SYNC_WORD);
  LoRa.enableCrc();
  Serial.println("[LoRa] Initialized OK");
  return true;
}

bool sendViaLoRa(SensorData &data, const char* treeID, float lat, float lon) {
  if (!initLoRa()) return false;

  StaticJsonDocument<384> doc;
  doc["id"]   = treeID;
  doc["t"]    = data.temperature;
  doc["h"]    = data.humidity;
  doc["sm"]   = (int)data.soilMoisturePct;
  doc["ph"]   = data.soilPH;
  doc["n"]    = data.nitrogen;
  doc["p"]    = data.phosphorus;
  doc["k"]    = data.potassium;
  doc["co2"]  = data.co2PPM;
  doc["aqi"]  = data.aqiValue;
  doc["lux"]  = (int)data.lightLux;
  doc["tlt"]  = data.tiltDegrees;
  doc["rn"]   = data.isRaining;
  doc["bt"]   = data.barkTempC;
  doc["bat"]  = data.batteryVoltage;
  doc["lat"]  = lat;
  doc["lon"]  = lon;
  doc["pkt"]  = LORA_PKT_SENSOR;

  char payload[384];
  serializeJson(doc, payload);

  LoRa.beginPacket();
  LoRa.print(payload);
  bool ok = LoRa.endPacket();
  
  Serial.printf("[LoRa] TX %s (%d bytes) RSSI estimate ~-100dBm\n",
                ok ? "OK" : "FAIL", strlen(payload));
  LoRa.sleep();
  return ok;
}

bool sendAlertLoRa(const char* treeID, const char* alertType, float value) {
  if (!initLoRa()) return false;
  
  StaticJsonDocument<128> doc;
  doc["id"]    = treeID;
  doc["pkt"]   = LORA_PKT_ALERT;
  doc["alert"] = alertType;
  doc["val"]   = value;

  char payload[128];
  serializeJson(doc, payload);

  LoRa.beginPacket();
  LoRa.print(payload);
  bool ok = LoRa.endPacket();
  LoRa.sleep();
  return ok;
}

#endif // LORA_COMM_H
