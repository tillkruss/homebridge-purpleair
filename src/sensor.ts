import axios from 'axios';
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { SensorReading } from './sensorReading';
import { ExampleHomebridgePlatform } from './platform';
import { type } from 'os';

// Characteristic.Model = `hardwarediscovered`
// Characteristic.SerialNumber = `SensorId`
// humidity
// aqiInsteadOfDensity
// conversion
// averages
// interval
// voc support check!

export class Sensor {

  static readonly UPDATE_INTERVAL = 60;

  private readonly startedAt: number;

  private sensorReading;

  private airQuality: Service;
  private humidity: Service;
  private temperature: Service;

  constructor(
    private readonly platform: ExampleHomebridgePlatform,
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

    this.airQuality.getCharacteristic(this.platform.Characteristic.AirQuality)
      .onGet(this.getAirQuality.bind(this));

    this.airQuality.getCharacteristic(this.platform.Characteristic.PM2_5Density)
      .onGet(this.getPM2_5Density.bind(this));

    this.airQuality.getCharacteristic(this.platform.Characteristic.PM10Density)
      .onGet(this.getPM10Density.bind(this));

    // this.airQuality.getCharacteristic(this.platform.Characteristic.VOCDensity)
    //   .onGet(this.getVOCDensity.bind(this));

    this.humidity = this.accessory.getService(this.platform.Service.HumiditySensor)
      || this.accessory.addService(this.platform.Service.HumiditySensor);

    this.humidity.setCharacteristic(this.platform.Characteristic.Name, this.name);

    this.humidity.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getCurrentRelativeHumidity.bind(this));

    this.temperature = this.accessory.getService(this.platform.Service.TemperatureSensor)
      || this.accessory.addService(this.platform.Service.TemperatureSensor);

    this.temperature.setCharacteristic(this.platform.Characteristic.Name, this.name);

    this.temperature.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    this.readSensor();

    setInterval(
      () => this.readSensor,
      Sensor.UPDATE_INTERVAL * 1000,
    );
  }

  updateReadings() {
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Model, '????')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.sensorReading.sensorId)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.sensorReading.version);

    this.airQuality.setCharacteristic(this.platform.Characteristic.Name, this.name);
    this.airQuality.updateCharacteristic(this.platform.Characteristic.AirQuality, this.getAirQuality());
    this.airQuality.updateCharacteristic(this.platform.Characteristic.PM2_5Density, this.getPM2_5Density());
    this.airQuality.updateCharacteristic(this.platform.Characteristic.PM10Density, this.getPM10Density());
    // TODO: update VOC

    this.humidity.setCharacteristic(this.platform.Characteristic.Name, this.name);
    this.humidity.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, this.getCurrentRelativeHumidity());

    this.temperature.setCharacteristic(this.platform.Characteristic.Name, this.name);
    this.temperature.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.getCurrentTemperature());
  }

  async readSensor() {
    try {
      const { data }: any = await axios.get(`http://${this.accessory.context.sensor.ip}/json`, {
        timeout: 5000,
      });

      this.sensorReading = new SensorReading(data);

      this.updateReadings();
    } catch (error) {
      this.platform.log.error('Unable to read sensor:', error);
    }
  }

  hasSensorReading() {
    return (typeof this.sensorReading === 'object');
  }

  isNotResponding() {
    const secondsSinceStart = (Date.now() - this.startedAt) / 1000;

    if (! this.hasSensorReading() || secondsSinceStart > 30) {
      return true;
    }

    const secondsSinceReading = (Date.now() - this.sensorReading.readAt) / 1000;

    if (secondsSinceReading > 180) {
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

    return this.sensorReading.name;
  }

  getAirQuality() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return this.platform.Characteristic.AirQuality.UNKNOWN;
    }

    if (this.sensorReading.pm2_5 < 50) {
      return this.platform.Characteristic.AirQuality.EXCELLENT;
    }

    if (this.sensorReading.pm2_5 < 100) {
      return this.platform.Characteristic.AirQuality.GOOD;
    }

    if (this.sensorReading.pm2_5 < 150) {
      return this.platform.Characteristic.AirQuality.FAIR;
    }

    if (this.sensorReading.pm2_5 < 200) {
      return this.platform.Characteristic.AirQuality.INFERIOR;
    }

    if (this.sensorReading.pm2_5 >= 200) {
      return this.platform.Characteristic.AirQuality.POOR;
    }

    return this.platform.Characteristic.AirQuality.UNKNOWN;
  }

  getPM2_5Density() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return 0;
    }

    return this.sensorReading.pm2_5;
  }

  getPM10Density() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return 0;
    }

    return this.sensorReading.pm10;
  }

  getVOCDensity() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return 0;
    }

    return this.sensorReading.voc;
  }

  getCurrentTemperature() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return -270;
    }

    return (this.sensorReading.temperature - 32) * 5/9;
  }

  getCurrentRelativeHumidity() {
    this.throwIfNotResponding();

    if (! this.hasSensorReading()) {
      return 0;
    }

    return this.sensorReading.humidity;
  }
}
