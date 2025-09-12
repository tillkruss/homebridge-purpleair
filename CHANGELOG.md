# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] - 2025-9-2
### Changed
- Limit PM10/2.5 report value to `1000`
- Mark as compatible with Homebridge 2.0

## [1.0.8] - 2023-10-13
### Changed
- Use `CF=1` readings for indoor sensors
- Apply US EPA conversion to indoor sensors
- Adjusted temperature by `-8°F` and humidity by `+4%` to better reflect ambient temperature

## [1.0.7] - 2023-09-02
### Fixed
- Avoid crash if no `sensors` are defined

## [1.0.6] - 2023-08-31
### Changed
- Changed package name to `homebridge-purpleair`
- Set accessory name from `sensors[].name` config

### Fixed
- Fixed detecting models with SD cards

## [1.0.5] - 2023-08-24
### Fixed
- Fixed `Status` logic to avoid HomeKit `0` readings

## [1.0.4] - 2023-08-24
### Changed
- Consider sensor inactive when no reading was taken

### Fixed
- Fixed "not responding" logic
- Protect against `NaN` readings when sensor just booted

## [1.0.3] - 2023-08-23
### Added
- Support `Characteristic.StatusActive`

### Changed
- Log configured sensors
- Round sensor values
- Retry failed initial sensor readings

### Fixed
- Fixed sensor reading interval logic
- Avoid "not responding" log spam

## [1.0.2] - 2023-08-22
### Changed
- Minor code cleanup
- Improved error reporting and logging

### Fixed
- Fixed logic bug in `Sensor::isNotResponding()`

## [1.0.1] - 2023-08-22
### Fixed
- Fixed `PLUGIN_NAME`

## [1.0.0] - 2023-08-22
### Added
- Initial release

[unreleased]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.8...HEAD
[1.0.8]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/tillkruss/homebridge-purpleair/releases/tag/v1.0.0
