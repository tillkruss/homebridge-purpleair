import axios from 'axios';
import { Service, PlatformAccessory } from 'homebridge';

import { SensorReading } from './sensorReading';
import { PurpleAirPlatform } from './platform';

export class Sensor {
  private airQuality: Service;
  private humidity: Service;
  private temperature: Service;
  private sensorReading: SensorReading | undefined;
  private readonly startedAt: number;

  static readonly updateInterval = 60;
  static readonly requestTimeout = 15;

  constructor(
    private readonly platform: PurpleAirPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.startedAt = Date.now();

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'PurpleAir')
      .setCharacteristic(this.platform.Characteristic.Model, 'Unknown')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Unknown');

    this.airQuality = this.accessory.getService(this.platform.Service.AirQualitySensor)
      || this.accessory.addService(this.platform.Service.AirQualitySensor);

    this.airQuality.setCharacteristic(this.platform.Characteristic.Name, this.name);
    this.airQuality.getCharacteristic(this.platform.Characteristic.AirQuality).onGet(this.getAirQuality.bind(this));
    this.airQuality.getCharacteristic(this.platform.Characteristic.PM2_5Density).onGet(this.getPM2_5Density.bind(this));
    this.airQuality.getCharacteristic(this.platform.Characteristic.PM10Density).onGet(this.getPM10Density.bind(this));
    this.airQuality.getCharacteristic(this.platform.Characteristic.StatusActive).onGet(this.getStatus.bind(this));

    this.humidity = this.accessory.getService(this.platform.Service.HumiditySensor)
      || this.accessory.addService(this.platform.Service.HumiditySensor);

    this.humidity.setCharacteristic(this.platform.Characteristic.Name, this.name);
    this.humidity.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity).onGet(this.getCurrentRelativeHumidity.bind(this));
    this.humidity.getCharacteristic(this.platform.Characteristic.StatusActive).onGet(this.getStatus.bind(this));

    this.temperature = this.accessory.getService(this.platform.Service.TemperatureSensor)
      || this.accessory.addService(this.platform.Service.TemperatureSensor);

    this.temperature.setCharacteristic(this.platform.Characteristic.Name, this.name);
    this.temperature.getCharacteristic(this.platform.Characteristic.CurrentTemperature).onGet(this.getCurrentTemperature.bind(this));
    this.temperature.getCharacteristic(this.platform.Characteristic.StatusActive).onGet(this.getStatus.bind(this));

    this.readSensor().then((response) => {
      if (response.constructor.name === 'AxiosError') {
        setTimeout(
          () => this.readSensor(),
          Sensor.requestTimeout * 1000,
        );
      }
    });

    setInterval(
      () => this.readSensor(),
      Sensor.updateInterval * 1000,
    );
  }

  updateReadings(sensorReading: SensorReading) {
    this.sensorReading = sensorReading;

    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .updateCharacteristic(this.platform.Characteristic.Model, this.sensorReading.model)
      .updateCharacteristic(this.platform.Characteristic.SerialNumber, this.sensorReading.sensorId)
      .updateCharacteristic(this.platform.Characteristic.FirmwareRevision, this.sensorReading.firmwareVersion);

    this.airQuality.updateCharacteristic(this.platform.Characteristic.Name, this.name);
    this.airQuality.updateCharacteristic(this.platform.Characteristic.StatusActive, true);
    this.airQuality.updateCharacteristic(this.platform.Characteristic.AirQuality, this.getAirQuality());
    this.airQuality.updateCharacteristic(this.platform.Characteristic.PM2_5Density, this.getPM2_5Density());
    this.airQuality.updateCharacteristic(this.platform.Characteristic.PM10Density, this.getPM10Density());

    if (this.sensorReading.hasVOC()) {
      this.airQuality.updateCharacteristic(this.platform.Characteristic.VOCDensity, this.getVOCDensity());
    }

    this.humidity.updateCharacteristic(this.platform.Characteristic.Name, this.name);
    this.humidity.updateCharacteristic(this.platform.Characteristic.StatusActive, true);
    this.humidity.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.getCurrentRelativeHumidity());

    this.temperature.updateCharacteristic(this.platform.Characteristic.Name, this.name);
    this.temperature.updateCharacteristic(this.platform.Characteristic.StatusActive, true);
    this.temperature.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.getCurrentTemperature());
  }

  async readSensor() {
    try {
      // eslint-disable-next-line
      const { data }: any = await axios.get(`http://${this.ip}/json`, {
        timeout: Sensor.requestTimeout * 1000,
      });

      const sensorReading = new SensorReading(data, this.platform.config);

      this.platform.log.debug(`Updating sensor [${this.ip}] readings: ${sensorReading}`);

      this.updateReadings(sensorReading);

      return sensorReading;
    } catch (error: any) { // eslint-disable-line
      this.platform.log.warn(`Unable to read sensor [${this.ip}] data: ${error.message}`);

      return error;
    }
  }

  hasSensorReading() {
    return (typeof this.sensorReading !== 'undefined');
  }

  isNotResponding() {
    const secondsSinceStart = (Date.now() - this.startedAt) / 1000;

    if (secondsSinceStart < (Sensor.requestTimeout * 4)) {
      return false;
    }

    if (! this.hasSensorReading()) {
      this.platform.log.debug(`Sensor [${this.ip}] has not responded`);

      return true;
    }

    const minutesSinceRead = (Date.now() - this.sensorReading!.readAt) / 1000 / 60;

    if (minutesSinceRead > (Sensor.updateInterval * 3)) {
      this.platform.log.debug(`Sensor [${this.ip}] has not responded in ${minutesSinceRead} minutes`);

      return true;
    }

    return false;
  }

  throwIfNotResponding() {
    if (this.isNotResponding()) {
      throw new this.platform.api.hap.HapStatusError(
        this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE,
      );
    }
  }

  get name(): string {
    if (! this.hasSensorReading()) {
      return 'PurpleAir';
    }

    return this.sensorReading!.name;
  }

  get ip(): string {
    return this.accessory.context.sensor.ip;
  }

  getStatus() {
    return ! this.isNotResponding();
  }

  getAirQuality() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return this.platform.Characteristic.AirQuality.UNKNOWN;
    }

    const aqi = this.sensorReading!.aqi;

    if (aqi < 50) {
      return this.platform.Characteristic.AirQuality.EXCELLENT;
    }

    if (aqi < 100) {
      return this.platform.Characteristic.AirQuality.GOOD;
    }

    if (aqi < 150) {
      return this.platform.Characteristic.AirQuality.FAIR;
    }

    if (aqi < 200) {
      return this.platform.Characteristic.AirQuality.INFERIOR;
    }

    if (aqi >= 200) {
      return this.platform.Characteristic.AirQuality.POOR;
    }

    return this.platform.Characteristic.AirQuality.UNKNOWN;
  }

  getPM2_5Density() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return 0;
    }

    if (this.platform.config.aqiInsteadOfDensity) {
      return this.sensorReading!.aqi;
    }

    return this.sensorReading!.pm2_5;
  }

  getPM10Density() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return 0;
    }

    return this.sensorReading!.pm10;
  }

  getVOCDensity() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return 0;
    }

    return this.sensorReading!.voc;
  }

  getCurrentTemperature() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return 0;
    }

    return this.sensorReading!.temperature;
  }

  getCurrentRelativeHumidity() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return 0;
    }

    return this.sensorReading!.humidity;
  }
}
