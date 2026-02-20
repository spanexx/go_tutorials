/**
 * Development Environment Configuration
 */

import { baseEnvironment } from './environment.base';

export const environment = {
  ...baseEnvironment,
  production: false,
  enableLogging: true,
  enableDebug: true,
  apiUrl: 'http://localhost:3000/api'
};
