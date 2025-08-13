# Changelog

## [Unreleased]

## [2.2.1] - 2024-01-13

### Added
- Automated GitHub Release creation from CHANGELOG.md
- CHANGELOG.md for better version tracking

### Fixed
- GitHub Actions workflow permissions for creating tags

### Changed
- Workflow now extracts release notes from CHANGELOG.md

## [2.2.0] - 2024-01-13

### Added
- API key is now required for all requests
- New `getCurrentUser()` method to retrieve user information
- New `checkCredits()` method to check remaining credits
- `InsufficientCreditsError` class for credit-related errors
- `onCreditsLow` callback option to notify when credits are running low
- Automatic GitHub Actions workflow for npm publishing

### Changed
- API key validation now warns if key doesn't start with "sk_"
- Updated error handling to detect credit-related 403 errors
- Enhanced TypeScript types with `UserInfo` and `APIKeyInfo`

### Breaking Changes
- API key is now mandatory (was optional in v2.1.x)

## [2.1.1] - 2024-01-10

### Fixed
- Repository URL and homepage in package.json

## [2.1.0] - 2024-01-08

### Added
- Environment variables support for agents
- Agent validation methods
- Webhook signature verification

## [2.0.0] - 2024-01-05

### Added
- Initial public release
- Core SDK functionality
- Flow execution methods
- Agent management
- Batch processing support

[Unreleased]: https://github.com/Dataframe-Consulting/ai-spine-sdk-js/compare/v2.2.0...HEAD
[2.2.0]: https://github.com/Dataframe-Consulting/ai-spine-sdk-js/compare/v2.1.1...v2.2.0
[2.1.1]: https://github.com/Dataframe-Consulting/ai-spine-sdk-js/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/Dataframe-Consulting/ai-spine-sdk-js/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/Dataframe-Consulting/ai-spine-sdk-js/releases/tag/v2.0.0