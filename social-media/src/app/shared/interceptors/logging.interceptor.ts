import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, tap, finalize } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Logging Interceptor - Logs HTTP requests and responses
 *
 * Provides debugging visibility into API calls:
 * - Logs request method, URL, and timing
 * - Logs response status and duration
 * - Only active in development/debug mode
 *
 * @example
 * // Console output:
 * // [HTTP] POST /api/v1/auth/login started
 * // [HTTP] POST /api/v1/auth/login completed in 234ms (201)
 */
export const loggingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  // Skip logging in production or if debug is disabled
  if (environment.production || !environment.enableDebug) {
    return next(req);
  }

  // Only log API requests
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const started = Date.now();

  // Log request
  console.log(
    `[HTTP] ${req.method} ${req.urlWithParams.replace(window.location.origin, '')} started`
  );

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse) {
        const elapsed = Date.now() - started;
        console.log(
          `[HTTP] ${req.method} ${req.urlWithParams.replace(window.location.origin, '')} completed in ${elapsed}ms (${event.status})`
        );
      }
    }),
    finalize(() => {
      // Additional cleanup if needed
    })
  );
};
