/**
 * TreeSense AI — mqtt_client.h
 * MQTT Connection & Publish Helpers for ESP32 Node
 */
#ifndef MQTT_CLIENT_H
#define MQTT_CLIENT_H
#include <PubSubClient.h>
#include "config.h"

bool connectMQTT(PubSubClient &client, const char* treeID) {
  char clientID[32];
  snprintf(clientID, sizeof(clientID), "node-%s", treeID);
  for (int attempt = 0; attempt < 3; attempt++) {
    char willTopic[64], willMsg[64];
    snprintf(willTopic, sizeof(willTopic), "treesense/%s/status", treeID);
    snprintf(willMsg,  sizeof(willMsg),  "{\"status\":\"offline\",\"id\":\"%s\"}", treeID);
    if (client.connect(clientID, nullptr, nullptr, willTopic, MQTT_QOS, true, willMsg)) {
      char subTopic[64];
      snprintf(subTopic, sizeof(subTopic), "treesense/%s/config",  treeID);
      client.subscribe(subTopic);
      snprintf(subTopic, sizeof(subTopic), "treesense/%s/command", treeID);
      client.subscribe(subTopic);
      char onlineMsg[64];
      snprintf(onlineMsg, sizeof(onlineMsg), "{\"status\":\"online\",\"id\":\"%s\"}", treeID);
      client.publish(willTopic, onlineMsg, true);
      Serial.println("[MQTT] Connected");
      return true;
    }
    Serial.printf("[MQTT] Failed state=%d, retry...\n", client.state());
    delay(2000);
  }
  return false;
}
#endif // MQTT_CLIENT_H
