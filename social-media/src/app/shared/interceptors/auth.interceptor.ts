import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Auth Interceptor - Adds JWT token to outgoing requests
 *
 * Automatically attaches the Authorization header with Bearer token
 * to all API requests if the user is authenticated.
 *
 * @example
 * // Request headers after interceptor:
 * // Authorization: Bearer <jwt_token>
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Skip if no token or not an API request
  if (!token || !isApiUrl(req.url)) {
    return next(req);
  }

  // Clone the request with the Authorization header
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq);
};

/**
 * Check if the URL is an API URL
 */
function isApiUrl(url: string): boolean {
  return url.includes('/api/');
}
