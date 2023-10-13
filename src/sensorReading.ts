
import { PlatformConfig } from 'homebridge';

/**
 * https://community.purpleair.com/t/sd-card-file-headers/279
 * https://community.purpleair.com/t/the-purpleair-utility/673
 * https://community.purpleair.com/t/what-is-the-difference-between-cf-1-atm-and-alt/6442
 */
export class SensorReading {
  public readonly readAt: number;

  constructor(
    private readonly data,
    private readonly config: PlatformConfig,
  ) {
    this.readAt = Date.now();
  }

  get name(): string {
    return `${this.data.Geo} (${this.data.place})`;
  }

  get sensorId(): string {
    return this.data.SensorId;
  }

  get firmwareVersion(): string {
    return this.data.version;
  }

  get model(): string {
    const hardware = this.data.hardwarediscovered
      .replace('+NO-DISK', '')
      .replace(/\+OPENLOG\+\d+ MB/, '+OPENLOG');

    switch (hardware) {
      case '2.0+BME280+PMSX003-A':
        return 'PA-I';
      case '2.0+BME280+PMSX003-B+PMSX003-A':
        return 'PA-II';
      case '2.0+OPENLOG+DS3231+BME280+PMSX003-B+PMSX003-A':
        return 'PA-II-SD';
      case '3.0+BME68X+KX122+PMSX003-A':
        return 'PA-I-LED';
      case '3.0+OPENLOG+RV3028+BME68X+PMSX003-A+PMSX003-B':
        return 'PA-II-FLEX';
      default:
        return 'Unknown';
    }
  }

  get pm2_5(): number {
    let value = this.data.pm2_5_atm;

    if ('pm2_5_atm_b' in this.data) {
      value = (this.data.pm2_5_atm + this.data.pm2_5_atm_b) / 2;
    }

    if (this.isIndoor()) {
      value = this.data.pm2_5_cf_1;

      if ('pm2_5_cf_1_b' in this.data) {
        value = (this.data.pm2_5_cf_1 + this.data.pm2_5_cf_1_b) / 2;
      }
    }

    return this.round(value);
  }

  get pm10(): number {
    let value = this.data.pm10_0_atm;

    if ('pm10_0_atm_b' in this.data) {
      value = (this.data.pm10_0_atm + this.data.pm10_0_atm_b) / 2;
    }

    if (this.isIndoor()) {
      value = this.data.pm10_0_cf_1;

      if ('pm10_0_cf_1_b' in this.data) {
        value = (this.data.pm10_0_cf_1 + this.data.pm10_0_cf_1_b) / 2;
      }
    }

    return this.round(value);
  }

  get voc(): number {
    return this.data.voc;
  }

  /**
   * Humidity adjusted by +4%.
   *
   * @see https://community.purpleair.com/t/purpleair-sensors-functional-overview/150
   */
  get humidity(): number {
    const correction = 4;

    return this.data.current_humidity + correction;
  }

  /**
   * Temperature adjusted by -8°F.
   *
   * @see https://community.purpleair.com/t/purpleair-sensors-functional-overview/150
   */
  get temperature(): number {
    const correction = -8;
    const fahrenheit = this.data.current_temp_f + correction;
    const celsius = (fahrenheit - 32) * 5/9;

    return this.round(celsius);
  }

  get aqi(): number {
    switch (this.config.conversion) {
      case 'US_EPA':
        return this.aqiEPA();
      default:
        return this.aqiRaw();
    }
  }

  toString(): string {
    return [
      `AQI=${this.aqi}`,
      `PM2.5=${this.pm2_5}µg/m³`,
      `Humidity=${this.humidity}%`,
      `Temperature=${this.temperature}°C`,
    ].join(', ');
  }

  isIndoor(): boolean {
    return this.data.place === 'inside';
  }

  isNaN(): boolean {
    return [
      'pm2.5_aqi',
      'pm2_5_atm',
      'pm2_5_cf_1',
      'pm10_0_atm',
      'pm10_0_cf_1',
      'current_temp_f',
      'current_humidity',
    ].some(
      (name) => isNaN(this.data[name]),
    );
  }

  hasVOC(): boolean {
    return ('voc' in this.data) && ! isNaN(this.data.voc);
  }

  secondsSinceRead(): number {
    return Math.floor((Date.now() - this.readAt) / 1000);
  }

  round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * The `*_aqi` values returned by PurpleAir appear to be identical to: `this.pmToAQI(this.pm2_5)`
   */
  aqiRaw(): number {
    if ('pm2.5_aqi_b' in this.data) {
      return (this.data['pm2.5_aqi'] + this.data['pm2.5_aqi_b']) / 2;
    }

    return this.data['pm2.5_aqi'];
  }

  /**
   * An updated 5 step algorithm for correcting sensor data was developed by the EPA based on new wildfire data.
   * This updated algorithm is the one currently used by PurpleAir. The 5 equations are found on Slide 26 at:
   * https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=353088&Lab=CEMM
   *
   * @see https://github.com/tidbyt/community/pull/1727
   */
  aqiEPA(): number {
    const pm25 = this.pm2_5;
    const humidity = this.humidity;

    let pm25_corrected = 0;

    if (0 <= pm25 && pm25 < 30) {
      pm25_corrected = 0.524 * pm25 - 0.0862 * humidity + 5.75;
    } else if (30 <= pm25 && pm25 < 50) {
      pm25_corrected = (0.786 * (pm25 / 20 - 3 / 2) + 0.524 * (1 - (pm25 / 20 - 3 / 2))) * pm25 - 0.0862 * humidity + 5.75;
    } else if (50 <= pm25 && pm25 < 210) {
      pm25_corrected = 0.786 * pm25 - 0.0862 * humidity + 5.75;
    } else if (210 <= pm25 && pm25 < 260) {
      const term1 = 0.69 * (pm25 / 50 - 21 / 5) + 0.786 * (1 - (pm25 / 50 - 21 / 5));
      const term2 = -0.0862 * humidity * (1 - (pm25 / 50 - 21 / 5));
      const term3 = 2.966 * (pm25 / 50 - 21 / 5);
      const term4 = 5.75 * (1 - (pm25 / 50 - 21 / 5));
      const term5 = 8.84 * 0.0001 * Math.pow(pm25, 2) * (pm25 / 50 - 21 / 5);
      pm25_corrected = term1 * pm25 + term2 + term3 + term4 + term5;
    } else if (260 <= pm25) {
      pm25_corrected = 2.966 + 0.69 * pm25 + 8.84 * 0.0001 * Math.pow(pm25, 2);
    }

    return this.pmToAQI(pm25_corrected);
  }

  /**
   * @see https://forum.airnowtech.org/t/the-aqi-equation/169
   */
  pmToAQI(pm: number): number {
    let aqi: number;

    const calcAQI = function (Cp: number, Ih: number, Il: number, BPh: number, BPl: number): number {
      const a = Ih - Il;
      const b = BPh - BPl;
      const c = Cp - BPl;

      return Math.round((a / b) * c + Il);
    };

    if (pm > 350.5) {
      aqi = calcAQI(pm, 500, 401, 500, 350.5);
    } else if (pm > 250.5) {
      aqi = calcAQI(pm, 400, 301, 350.4, 250.5);
    } else if (pm > 150.5) {
      aqi = calcAQI(pm, 300, 201, 250.4, 150.5);
    } else if (pm > 55.5) {
      aqi = calcAQI(pm, 200, 151, 150.4, 55.5);
    } else if (pm > 35.5) {
      aqi = calcAQI(pm, 150, 101, 55.4, 35.5);
    } else if (pm > 12.1) {
      aqi = calcAQI(pm, 100, 51, 35.4, 12.1);
    } else if (pm >= 0) {
      aqi = calcAQI(pm, 50, 0, 12, 0);
    } else {
      aqi = 0;
    }

    return aqi;
  }
}
