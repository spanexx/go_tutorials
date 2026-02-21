import { environment } from '../../../environments/environment';

export type DebugLogScope =
  | 'AuthService'
  | 'LoginComponent'
  | 'RegisterComponent'
  | 'SearchService'
  | 'HashtagService'
  | 'Http'
  | 'Cache'
  | 'App';

export function debugLog(scope: DebugLogScope, message: string, data?: unknown): void {
  if (environment.production || !environment.enableDebug) {
    return;
  }

  const prefix = `[${scope}]`;
  if (data === undefined) {
    console.log(prefix, message);
    return;
  }

  console.log(prefix, message, data);
}

export function debugWarn(scope: DebugLogScope, message: string, data?: unknown): void {
  if (environment.production || !environment.enableDebug) {
    return;
  }

  const prefix = `[${scope}]`;
  if (data === undefined) {
    console.warn(prefix, message);
    return;
  }

  console.warn(prefix, message, data);
}

export function debugError(scope: DebugLogScope, message: string, data?: unknown): void {
  if (environment.production || !environment.enableDebug) {
    return;
  }

  const prefix = `[${scope}]`;
  if (data === undefined) {
    console.error(prefix, message);
    return;
  }

  console.error(prefix, message, data);
}
