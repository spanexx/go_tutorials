/**
 * Environment Configuration
 * This file is replaced during build based on configuration
 */

import { baseEnvironment } from './environment.base';
export { EnvironmentConfig, FeatureFlags } from './environment.base';

// Default to development environment
// This will be replaced with the appropriate environment file during build
export const environment = baseEnvironment;

export { environment as devEnvironment } from './environment.development';
export { environment as prodEnvironment } from './environment.production';
