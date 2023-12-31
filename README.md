# Homebridge PurpleAir Plugin
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)
[![github](https://img.shields.io/github/actions/workflow/status/tillkruss/homebridge-purpleair/build.yml)](https://github.com/tillkruss/homebridge-purpleair/actions)
[![npm](https://img.shields.io/npm/v/homebridge-purpleair)](https://www.npmjs.com/package/homebridge-purpleair)

A Homebridge plugin to connect [PurpleAir](https://purpleair.com/) sensors.

- Exposes humidity, temperature and VOC readings
- Supports updated _US EPA PM2.5 AQI_ conversion
- Increased accuracy with _Dual Laser_ readings
- Can report AQI instead of PM2.5 Density
- Detects sensor firmware and model
- Works with multiple and private sensors

This plugin **only supports local sensors**, if you want to use PurpleAir's paid API use Jacek Suliga's excellent [Homebridge PurpleAir Sensor](https://github.com/jmkk/homebridge-purpleair-sensor) plugin.

## Installation

Search for `homebridge-purpleair` in Homebridge UI, or install it via CLI:

```shell
$ sudo npm install -g --unsafe-perm homebridge-purpleair
```

## Configuration

You may configure this plugin using Homebridge UI, or by editing your `config.json`:

```json
{
    "bridge": {},
    "accessories": [],
    "platforms": [
        {
            "platform": "PurpleAir",
            "conversion": "US_EPA",
            "aqiInsteadOfDensity": true,
            "sensors": [
                { "ip": "192.168.0.42" },
                { "ip": "192.168.0.47", "name": "PurpleAir Garage" }
            ]
        }
    ]
}
```

| Option                | Type      | Default  | Description |
| --------------------- | --------- | -------- | ----------- |
| `conversion`          | `string`  | `US_EPA` | The data correction used to determine the air quality index (AQI). |
| `aqiInsteadOfDensity` | `boolean` | `false`  | _(Optional)_ HomeKit doesn't expose the air quality index (AQI). If enabled, the plugin will report the AQI in the "PM2.5 Density (µg/m³)" field. |
| `sensors`             | `array `  | `[]`     | An array containing the PurpleAir sensors. |
| `sensors[].ip`        | `string`  |          | The IP address of the sensor on the local network. |
| `sensors[].name`      | `string`  |          | _(Optional)_ The name of the sensor. Useful to distinguish multiple sensors. |


## Conversions

### US EPA

Courtesy of the United States Environmental Protection Agency Office of Research and Development, correction equation from their [US wide study](https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=353088&Lab=CEMM) (updated version from October 22 2021) as applied on the AirNow Fire and Smoke Map.
