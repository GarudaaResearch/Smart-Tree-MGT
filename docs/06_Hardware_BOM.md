# Hardware Bill of Materials (BOM)
## TreeSense AI — Smart Tree Sensor Node

**Document Version:** 1.0 | **Date:** May 2026 | **Author:** Prof. Anjit Raja R — RGU CII

---

## 1. ESP32 Sensor Node BOM

### 1.1 Microcontroller & Communication

| # | Component | Model | Qty | Unit Cost (₹) | Notes |
|---|-----------|-------|-----|---------------|-------|
| 1 | Microcontroller | ESP32-WROOM-32D | 1 | ₹350 | 240 MHz dual-core, Wi-Fi + BT |
| 2 | LoRa Module | SX1276 (Ra-02) | 1 | ₹450 | 868/915 MHz long-range |
| 3 | GPS Module | NEO-6M | 1 | ₹380 | UART, 10Hz update rate |
| 4 | RTC Module | DS3231 | 1 | ₹120 | I2C, battery-backed |
| 5 | MicroSD Module | SPI breakout | 1 | ₹80 | Local data buffering |
| 6 | Wi-Fi Antenna | 2.4 GHz omnidirectional | 1 | ₹60 | External |

### 1.2 Environmental Sensors

| # | Sensor | Model | Parameter | Interface | Unit Cost (₹) |
|---|--------|-------|-----------|-----------|---------------|
| 7 | Temp + Humidity | DHT22 | Air temp, RH | 1-Wire | ₹180 |
| 8 | Barometric Pressure | BME280 | Pressure, temp, humidity | I2C | ₹220 |
| 9 | Light Intensity | BH1750 | Lux (0–65535) | I2C | ₹90 |
| 10 | UV Index | VEML6070 | UV-A radiation | I2C | ₹150 |
| 11 | CO₂ | MH-Z19B | 400–5000 ppm | UART | ₹850 |
| 12 | Air Quality / VOC | MQ135 | NH3, NOx, alcohol | Analog | ₹120 |
| 13 | Particulate Matter | PMS5003 | PM1.0, PM2.5, PM10 | UART | ₹950 |
| 14 | Wind Speed | Anemometer RS485 | 0–30 m/s | RS485 | ₹1,200 |
| 15 | Wind Direction | Wind vane RS485 | 0–360° | RS485 | ₹850 |
| 16 | Rain Gauge | Tipping bucket | mm/hr | Digital | ₹700 |

### 1.3 Soil Sensors

| # | Sensor | Model | Parameter | Interface | Unit Cost (₹) |
|---|--------|-------|-----------|-----------|---------------|
| 17 | Soil Moisture | Capacitive probe v1.2 | Volumetric % | Analog | ₹150 |
| 18 | Soil Temperature | DS18B20 | -55 to +125°C | 1-Wire | ₹120 |
| 19 | Soil pH | pH electrode + module | 0–14 pH | Analog | ₹650 |
| 20 | Soil EC | EC sensor | 0–20 mS/cm | Analog | ₹480 |
| 21 | NPK Sensor | RS485 NPK probe | N, P, K mg/kg | RS485 | ₹2,800 |

### 1.4 Tree Physiology Sensors

| # | Sensor | Model | Parameter | Interface | Unit Cost (₹) |
|---|--------|-------|-----------|-----------|---------------|
| 22 | Trunk Vibration | MPU6050 (Accelerometer) | Acceleration, vibration Hz | I2C | ₹180 |
| 23 | Bark Temperature | MLX90614 (IR) | Surface temp | I2C | ₹350 |
| 24 | Leaf Wetness | LWS-L | Leaf wetness % | Analog | ₹280 |

### 1.5 Power System

| # | Component | Spec | Qty | Unit Cost (₹) |
|---|-----------|------|-----|---------------|
| 25 | Solar Panel | 5W 6V monocrystalline | 1 | ₹380 |
| 26 | LiPo Battery | 3.7V 5000 mAh | 1 | ₹650 |
| 27 | Solar Charge Controller | TP4056 + protection | 1 | ₹85 |
| 28 | Buck Converter | LM2596 (3.3V/5V) | 1 | ₹60 |
| 29 | Battery Fuel Gauge | MAX17043 | 1 | ₹220 |

### 1.6 Enclosure & Mechanical

| # | Component | Spec | Qty | Unit Cost (₹) |
|---|-----------|------|-----|---------------|
| 30 | Weatherproof Box | IP67 ABS enclosure | 1 | ₹450 |
| 31 | PCB (Custom) | 100×80mm 2-layer | 1 | ₹350 |
| 32 | Mounting Straps | Stainless steel tree strap | 2 | ₹80 |
| 33 | Cable Glands | M16 waterproof | 4 | ₹40 |
| 34 | Sensor Radiation Shield | Stevenson screen mini | 1 | ₹280 |
| 35 | QR Tag | UV-resistant metal label | 1 | ₹60 |
| 36 | Miscellaneous | Connectors, wires, PCB headers | — | ₹200 |

---

## 2. Node Cost Summary

| Category | Cost (₹) |
|----------|----------|
| Microcontroller + Communication | ₹1,440 |
| Environmental Sensors | ₹5,310 |
| Soil Sensors | ₹4,200 |
| Tree Physiology Sensors | ₹810 |
| Power System | ₹1,395 |
| Enclosure & Mechanical | ₹1,460 |
| **Total per Node** | **₹14,615** |
| **Total for 100 Nodes** | **₹14,61,500** |

> **Note:** Bulk purchase discount of ~20–30% expected for quantities > 50 units.

---

## 3. Gateway / Edge Hardware

| Component | Model | Qty | Unit Cost (₹) |
|-----------|-------|-----|---------------|
| Raspberry Pi 4B (4GB) | RPi 4 Model B | 1 | ₹5,500 |
| LoRa Gateway Hat | RAK2287 | 1 | ₹8,500 |
| 4G LTE HAT | Waveshare SIM7600G | 1 | ₹3,200 |
| MicroSD Card 64GB | SanDisk Endurance | 1 | ₹950 |
| Weatherproof Enclosure | IP65 aluminium | 1 | ₹1,800 |
| SIM Card (JIO/BSNL) | Data-only plan | 1 | ₹299/month |
| **Total per Gateway** | | | **₹19,950** |

---

## 4. Cloud & Software Costs (Annual)

| Service | Provider | Cost/Month (₹) |
|---------|----------|----------------|
| EC2 t3.medium (Backend) | AWS | ₹2,900 |
| RDS PostgreSQL db.t3.small | AWS | ₹1,800 |
| ElastiCache Redis cache.t3.micro | AWS | ₹900 |
| IoT Core (1M messages) | AWS | ₹700 |
| S3 (100 GB storage) | AWS | ₹240 |
| CloudFront CDN | AWS | ₹400 |
| **Total Cloud/Month** | | **₹6,940** |

---

## 5. Where to Source Components (India)

| Supplier | URL | Speciality |
|----------|-----|------------|
| Robu.in | robu.in | ESP32, sensors, LoRa |
| Evelta | evelta.com | Raspberry Pi, modules |
| CrazyPI | crazypi.com | Sensors, enclosures |
| ThinkRobotics | thinkrobotics.com | Agricultural sensors |
| Amazon India | amazon.in | Miscellaneous components |
| AliExpress | aliexpress.com | Bulk sensor orders |

---

*© 2026 RGU Centre for Innovation and Incubation — Prof. Anjit Raja R*
