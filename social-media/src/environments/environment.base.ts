/**
 * Environment Configuration
 * Base environment configuration
 */

export interface EnvironmentConfig {
  production: boolean;
  apiUrl: string;
  apiVersion: string;
  appName: string;
  appVersion: string;
  enableLogging: boolean;
  enableDebug: boolean;
  features: FeatureFlags;
}

export interface FeatureFlags {
  enableAnalytics: boolean;
  enableNotifications: boolean;
  enableDarkMode: boolean;
  enableImageUpload: boolean;
  enableVideoUpload: boolean;
  enableLiveChat: boolean;
  enableWebSockets: boolean;
}

export const baseEnvironment: EnvironmentConfig = {
  production: false,
  apiUrl: '/api',
  apiVersion: 'v1',
  appName: 'SocialHub',
  appVersion: '1.0.0',
  enableLogging: true,
  enableDebug: true,
  features: {
    enableAnalytics: true,
    enableNotifications: true,
    enableDarkMode: true,
    enableImageUpload: true,
    enableVideoUpload: false,
    enableLiveChat: false,
    enableWebSockets: false
  }
};
