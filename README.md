# Homebridge PurpleAir Plugin

A Homebridge plugin to connect [PurpleAir](https://purpleair.com/) sensors.

- Supports multiple and private sensors
- Supports VOC, humidity and temperature readings
- Supports updated `US EPA PM2.5 AQI` conversion
- Supports reporting AQI instead of PM2.5 Density

This plugin only supports local sensors, if you want to use PurpleAir's paid API, use Jacek Suliga's excellent [`homebridge-purpleair-sensor`](https://github.com/jmkk/homebridge-purpleair-sensor).

## Installation

Search for `@tillkruss/homebridge-purpleair` in Homebridge UI, or install it via CLI:

```shell
$ sudo npm install -g --unsafe-perm @tillkruss/homebridge-purpleair
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
                { "ip": "10.0.1.42" },
                { "ip": "10.0.1.47" }
            ]
        }
    ]
}
```

## TODO

- [Get verified](https://github.com/homebridge/verified)
- Ensure `SERVICE_COMMUNICATION_FAILURE` works as expected
