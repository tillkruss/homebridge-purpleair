
import { PlatformConfig } from 'homebridge';

/**
 * https://community.purpleair.com/t/understanding-sd-card-data-columns/279
 * https://community.purpleair.com/t/the-purpleair-utility/673
 * https://community.purpleair.com/t/what-is-the-difference-between-cf-1-atm-and-alt/6442
 *
 * https://community.purpleair.com/t/sensor-json-documentation/6917
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
    return this.isIndoor() ? this.pm2_5_cf1 : this.pm2_5_atm;
  }

  get pm2_5_atm(): number {
    let value = this.data.pm2_5_atm;

    if ('pm2_5_atm_b' in this.data) {
      value = (this.data.pm2_5_atm + this.data.pm2_5_atm_b) / 2;
    }

    return this.round(value);
  }

  get pm2_5_cf1(): number {
    let value = this.data.pm2_5_cf_1;

    if ('pm2_5_cf_1_b' in this.data) {
      value = (this.data.pm2_5_cf_1 + this.data.pm2_5_cf_1_b) / 2;
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
    const humidity = this.data.current_humidity + correction;

    return Math.max(0, Math.min(100, humidity));
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

    return Math.max(-270, Math.min(100, this.round(celsius)));
  }

  get aqi(): number {
    switch (this.config.conversion) {
      case 'US_EPA':
        return this.isIndoor() ? this.epaCF1() : this.epaATM();
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

  epaCF1(): number {
    const pm25 = this.pm2_5_cf1;
    const humidity = this.humidity;

    let pm25_corrected = 0;

    if (pm25 > 343) {
      pm25_corrected = 0.46 * pm25 + 3.93 * Math.pow(10, -4) * Math.pow(pm25, 2) + 2.97;
    } else {
      pm25_corrected = 0.524 * pm25 - 0.0862 * humidity + 5.75;
    }

    return this.pmToAQI(pm25_corrected);
  }

  /**
   * An updated 5 step algorithm for correcting sensor data was developed by the EPA based on new wildfire data.
   * This updated algorithm is the one currently used by PurpleAir. The 5 equations are found on Slide 26 of
   * "Sensor data cleaning and correction: Application on the AirNow Fire and Smoke Map" (Barkjohn et al.,
   * American Association for Aerosol Research Conference, October 18-22 2021). EPA's Science Inventory no
   * longer serves that record, so the link below points at an archived copy of the slides.
   *
   * @see https://web.archive.org/web/20241210090849/https://cfpub.epa.gov/si/si_public_file_download.cfm?p_download_id=544231&Lab=CEMM
   * @see https://github.com/tidbyt/community/pull/1727
   */
  epaATM(): number {
    const pm25 = this.pm2_5_atm;
    const humidity = this.humidity;

    let pm25_corrected = 0;

    if (pm25 >= 260) {
      pm25_corrected = 2.966 + 0.69 * pm25 + 8.84 * Math.pow(10, -4) * Math.pow(pm25, 2);
    } else if (pm25 >= 210) {
      const term1 = 0.69 * (pm25 / 50 - 4.2) + 0.786 * (1 - (pm25 / 50 - 4.2));
      const term2 = -0.0862 * humidity * (1 - (pm25 / 50 - 4.2));
      const term3 = 2.966 * (pm25 / 50 - 4.2);
      const term4 = 5.75 * (1 - (pm25 / 50 - 4.2));
      const term5 = 8.84 * Math.pow(10, -4) * Math.pow(pm25, 2) * (pm25 / 50 - 4.2);
      pm25_corrected = term1 * pm25 + term2 + term3 + term4 + term5;
    } else if (pm25 >= 50) {
      pm25_corrected = 0.786 * pm25 - 0.0862 * humidity + 5.75;
    } else if (pm25 >= 30) {
      pm25_corrected = (0.786 * (pm25 / 20 - 3 / 2) + 0.524 * (1 - (pm25 / 20 - 3 / 2))) * pm25 - 0.0862 * humidity + 5.75;
    } else {
      pm25_corrected = 0.524 * pm25 - 0.0862 * humidity + 5.75;
    }

    return this.pmToAQI(pm25_corrected);
  }

  /**
   * Converts a PM2.5 concentration (µg/m³) into an AQI value.
   *
   * Uses the breakpoints that took effect on May 6, 2024, which lowered the ceiling of the
   * "Good" category from `12.0` to `9.0` µg/m³ and rescaled the "Unhealthy", "Very Unhealthy"
   * and "Hazardous" categories.
   *
   * Concentrations above `325.4` µg/m³ are "beyond the AQI" and extrapolated from the
   * highest breakpoint, so that worsening air quality keeps increasing the reported value.
   *
   * @see https://www.ecfr.gov/current/title-40/part-58/appendix-Appendix%20G%20to%20Part%2058
   * @see https://document.airnow.gov/technical-assistance-document-for-the-reporting-of-daily-air-quailty.pdf
   */
  pmToAQI(pm: number): number {
    // `[concentrationLow, concentrationHigh, indexLow, indexHigh]`
    const breakpoints = [
      [0.0, 9.0, 0, 50],
      [9.1, 35.4, 51, 100],
      [35.5, 55.4, 101, 150],
      [55.5, 125.4, 151, 200],
      [125.5, 225.4, 201, 300],
      [225.5, 325.4, 301, 500],
    ];

    if (isNaN(pm) || pm <= 0) {
      return 0;
    }

    // the AQI equation expects the concentration truncated to `0.1` µg/m³
    const concentration = Math.floor(pm * 10) / 10;

    const [
      concentrationLow,
      concentrationHigh,
      indexLow,
      indexHigh,
    ] = breakpoints.find(([, high]) => concentration <= high) ?? breakpoints[breakpoints.length - 1];

    const slope = (indexHigh - indexLow) / (concentrationHigh - concentrationLow);

    return Math.round(slope * (concentration - concentrationLow) + indexLow);
  }
}
