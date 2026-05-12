/**
 * TreeSense AI — ESP32 Smart Tree Sensor Node
 * Firmware Configuration Header
 * Project: AI-Driven IoT Framework for Tree Behaviour Analysis
 * Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0 | May 2026
 */

#ifndef CONFIG_H
#define CONFIG_H

// ── DEVICE IDENTITY ──────────────────────────────────────
#define FIRMWARE_VERSION    "1.0.0"
#define DEVICE_PREFIX       "TBA-NODE"

// ── WIFI ─────────────────────────────────────────────────
#define WIFI_SSID           "TreeSenseGateway"
#define WIFI_PASSWORD       "TreeSense@2026"
#define WIFI_TIMEOUT_MS     10000

// ── MQTT ─────────────────────────────────────────────────
#define MQTT_BROKER_IP      "192.168.1.100"
#define MQTT_PORT           1883
#define MQTT_TLS_PORT       8883
#define MQTT_QOS            1
// Topics: treesense/{tree_id}/sensors|image|alert|config|heartbeat

// ── LoRa SX1276 ──────────────────────────────────────────
#define LORA_FREQUENCY      915E6
#define LORA_SPREADING      10
#define LORA_BANDWIDTH      125E3
#define LORA_TX_POWER       17
#define LORA_SYNC_WORD      0xAB
#define LORA_SCK_PIN        18
#define LORA_MISO_PIN       19
#define LORA_MOSI_PIN       23
#define LORA_SS_PIN         5
#define LORA_RST_PIN        14
#define LORA_DIO0_PIN       2

// ── GPS Neo-6M ───────────────────────────────────────────
#define GPS_RX_PIN          16
#define GPS_TX_PIN          17
#define GPS_BAUD            9600
#define GPS_FIX_TIMEOUT_S   30

// ── SENSOR PINS ──────────────────────────────────────────
#define DHT_PIN             4
#define DHT_TYPE            DHT22
#define BME280_I2C_ADDR     0x76
#define SOIL_MOISTURE_PIN   34
#define SOIL_DRY_VALUE      3200
#define SOIL_WET_VALUE      1100
#define SOIL_PH_PIN         35
#define NPK_RX_PIN          32
#define NPK_TX_PIN          33
#define NPK_DE_PIN          25
#define NPK_BAUD            4800
#define CO2_RX_PIN          26
#define CO2_TX_PIN          27
#define CO2_BAUD            9600
#define AQI_PIN             36
#define BH1750_I2C_ADDR     0x23
#define MPU6050_I2C_ADDR    0x68
#define TILT_THRESHOLD_DEG  5.0f
#define RAIN_SENSOR_PIN     13
#define ULTRASONIC_TRIG     22
#define ULTRASONIC_ECHO     23
#define THERMAL_I2C_ADDR    0x5A
#define I2C_SDA_PIN         21
#define I2C_SCL_PIN         22

// ── POWER MANAGEMENT ─────────────────────────────────────
#define DEEP_SLEEP_DURATION_S   300
#define BATTERY_ADC_PIN         33
#define LOW_BATTERY_THRESHOLD_V 3.5f
#define CRITICAL_BATTERY_V      3.2f

// ── ALERT THRESHOLDS ─────────────────────────────────────
#define TEMP_HIGH_ALERT_C       40.0f
#define TEMP_LOW_ALERT_C        5.0f
#define HUMIDITY_LOW_ALERT_PCT  20.0f
#define SOIL_MOISTURE_LOW_PCT   15.0f
#define CO2_HIGH_ALERT_PPM      1000
#define TILT_ALERT_DEG          10.0f
#define PH_LOW_ALERT            4.5f
#define PH_HIGH_ALERT           8.5f

// ── SD CARD BUFFER ───────────────────────────────────────
#define SD_CS_PIN           5
#define SD_LOG_FILE         "/treesense_buffer.jsonl"

// ── EEPROM LAYOUT ────────────────────────────────────────
#define EEPROM_SIZE         512
#define EEPROM_TREE_ID_ADDR 0
#define EEPROM_LAT_ADDR     20
#define EEPROM_LON_ADDR     28

// ── DEBUG ────────────────────────────────────────────────
#define SERIAL_BAUD         115200
#define DEBUG_MODE          true

#endif // CONFIG_H
