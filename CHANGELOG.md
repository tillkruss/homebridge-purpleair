# Changelog

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [unreleased]
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

[unreleased]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/tillkruss/homebridge-purpleair/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/tillkruss/homebridge-purpleair/releases/tag/v1.0.0
