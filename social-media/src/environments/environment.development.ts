/**
 * Development Environment Configuration
 */

import { baseEnvironment } from './environment.base';

export const environment = {
  ...baseEnvironment,
  production: false,
  enableLogging: true,
  enableDebug: true
};
