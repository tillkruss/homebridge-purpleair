import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { Sensor } from './sensor';

export class PurpleAirPlatform implements DynamicPlatformPlugin {
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
    this.log.debug('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  setUpSensors() {
    if (! this.config.sensors?.length) {
      this.log.warn('No sensors configured');
    }

    const ips: string[] = [];
    const configuredUuids = new Set<string>();

    for (const sensor of this.config.sensors ?? []) {
      if (ips.includes(sensor.ip)) {
        this.log.error('Ignoring duplicate sensor:', sensor.ip);

        continue;
      }

      const uuid = this.api.hap.uuid.generate(sensor.ip);
      const displayName = sensor.name || 'PurpleAir';

      configuredUuids.add(uuid);

      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring sensor:', existingAccessory.displayName);

        existingAccessory.context.sensor = sensor;

        this.api.updatePlatformAccessories([existingAccessory]);

        new Sensor(this, existingAccessory);
      } else {
        this.log.info('Adding sensor:', displayName);

        const accessory = new this.api.platformAccessory(displayName, uuid);

        accessory.context.sensor = sensor;

        new Sensor(this, accessory);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }

      ips.push(sensor.ip);
    }

    this.removeStaleSensors(configuredUuids);
  }

  removeStaleSensors(configuredUuids: Set<string>) {
    const staleAccessories = this.accessories.filter(accessory => ! configuredUuids.has(accessory.UUID));

    if (! staleAccessories.length) {
      return;
    }

    for (const accessory of staleAccessories) {
      this.log.info('Removing sensor:', accessory.displayName);
    }

    this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, staleAccessories);
  }
}
