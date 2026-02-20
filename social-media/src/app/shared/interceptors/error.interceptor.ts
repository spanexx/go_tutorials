import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

/**
 * Error Handling Interceptor - Handles HTTP errors globally
 *
 * Catches HTTP errors and:
 * - Shows user-friendly toast messages
 * - Handles 401 Unauthorized (token expired/invalid)
 * - Logs errors for debugging
 *
 * @example
 * // 401 -> Auto logout and redirect to login
 * // 400 -> Show validation error toast
 * // 500 -> Show generic error toast
 */
export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';
      let errorTitle = 'Error';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
        errorTitle = 'Client Error';
      } else {
        // Server-side error
        switch (error.status) {
          case 400:
            errorTitle = 'Bad Request';
            errorMessage = error.error?.error || 'Invalid request';
            break;
          case 401:
            errorTitle = 'Unauthorized';
            errorMessage = 'Your session has expired. Please login again.';
            // Clear auth state and redirect to login
            authService.logout();
            router.navigate(['/login'], {
              queryParams: { returnUrl: router.url }
            });
            break;
          case 403:
            errorTitle = 'Forbidden';
            errorMessage = 'You do not have permission to access this resource';
            break;
          case 404:
            errorTitle = 'Not Found';
            errorMessage = 'The requested resource was not found';
            break;
          case 409:
            errorTitle = 'Conflict';
            errorMessage = error.error?.error || 'Resource already exists';
            break;
          case 500:
            errorTitle = 'Internal Server Error';
            errorMessage = 'Something went wrong. Please try again later.';
            break;
          case 502:
            errorTitle = 'Bad Gateway';
            errorMessage = 'Server is temporarily unavailable';
            break;
          case 503:
            errorTitle = 'Service Unavailable';
            errorMessage = 'Service is temporarily unavailable';
            break;
          default:
            errorMessage = error.error?.error || `Error: ${error.status}`;
        }
      }

      // Show toast notification
      toastService.error(errorTitle, errorMessage);

      // Log error for debugging (in development)
      if (req.url.includes('/api/')) {
        console.error(`HTTP Error ${error.status}:`, {
          url: req.url,
          method: req.method,
          error: errorMessage
        });
      }

      return throwError(() => error);
    })
  );
};
