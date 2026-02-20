/**
 * Production Environment Configuration
 */

import { baseEnvironment } from './environment.base';

export const environment = {
  ...baseEnvironment,
  production: true,
  enableLogging: false,
  enableDebug: false,
  apiUrl: '/api'
};
