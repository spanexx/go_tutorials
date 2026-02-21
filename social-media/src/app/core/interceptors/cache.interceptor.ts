import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../services/cache.service';

/**
 * Cache Interceptor
 * 
 * Intercepts HTTP GET requests and returns cached responses if available.
 * If not cached, it forwards the request and caches the successful response.
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        return next(req);
    }

    // To prevent caching certain requests, you could add custom headers and check them here:
    // if (req.headers.has('X-Skip-Cache')) {
    //   return next(req);
    // }

    const cacheService = inject(CacheService);
    const cachedResponse = cacheService.get(req.urlWithParams);

    if (cachedResponse) {
        console.log(`%c[CacheInterceptor] %cHIT: %c${req.urlWithParams}`, 'color: #3498db; font-weight: bold;', 'color: #2ecc71; font-weight: bold;', 'color: inherit;');
        // Return the cached response as an observable
        return of(cachedResponse.clone()); // Clone to prevent mutation issues
    }

    // Send the request and cache the response
    return next(req).pipe(
        tap(event => {
            if (event instanceof HttpResponse) {
                console.log(`%c[CacheInterceptor] %cMISS: %c${req.urlWithParams}`, 'color: #3498db; font-weight: bold;', 'color: #e74c3c; font-weight: bold;', 'color: inherit;');
                cacheService.put(req.urlWithParams, event.clone()); // Clone before caching
            }
        })
    );
};
