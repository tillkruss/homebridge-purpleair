import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { Sensor } from './sensor';

export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.api.on('didFinishLaunching', () => {
      this.setUpSensors();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  setUpSensors() {

    if (! this.config.sensors.length) {
      this.log.warn('No sensors configured');

      return;
    }

    // TODO: check for duplicate IPs!!!

    for (const sensor of this.config.sensors) {
      // const sensorReading = await this.readSensor(sensor);

      // if (! sensorReading) {
      //   return;
      // }

      const uuid = this.api.hap.uuid.generate(sensor.ip);
      const displayName = sensor.name || 'PurpleAir';

      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring sensor:', existingAccessory.displayName);

        existingAccessory.context.sensor = sensor;
        // existingAccessory.context.reading = sensorReading;
        this.api.updatePlatformAccessories([existingAccessory]);

        new Sensor(this, existingAccessory);
      } else {
        this.log.info('Adding sensor:', displayName);

        const accessory = new this.api.platformAccessory(displayName, uuid);

        accessory.context.sensor = sensor;
        // accessory.context.reading = sensorReading;

        new Sensor(this, accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }

  // async readSensor(sensor) {
  //   try {
  //     const { data }: any = await axios.get(`http://${sensor.ip}/json`, {
  //       timeout: 5000,
  //     });

  //     return new SensorReading(data);
  //   } catch (error) {
  //     this.log.error('Unable to read sensor:', error);

  //     return false;
  //   }
  // }
}
