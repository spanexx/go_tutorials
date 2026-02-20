import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Base API Service - Provides common HTTP methods for API calls
 *
 * Abstract base class for all API services. Provides:
 * - Pre-configured API URL
 * - Common HTTP methods (GET, POST, PUT, DELETE)
 * - Type-safe request/response handling
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class UserService extends BaseApiService {
 *   getUsers(): Observable<User[]> {
 *     return this.get<User[]>('/users');
 *   }
 * }
 * ```
 */
export abstract class BaseApiService {
  /** Base API URL from environment */
  protected readonly apiUrl = environment.apiUrl;

  /** API version from environment */
  protected readonly apiVersion = environment.apiVersion;

  /** Full base path including version */
  protected readonly basePath: string;

  constructor(protected http: HttpClient) {
    this.basePath = `${this.apiUrl}/${this.apiVersion}`;
  }

  /**
   * Perform HTTP GET request
   * @param endpoint - API endpoint (without base path)
   * @param params - Optional query parameters
   */
  protected get<T>(endpoint: string, params?: Record<string, any>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<T>(`${this.basePath}${endpoint}`, { params });
  }

  /**
   * Perform HTTP POST request
   * @param endpoint - API endpoint (without base path)
   * @param body - Request body
   * @param headers - Optional custom headers
   */
  protected post<T>(
    endpoint: string,
    body: any,
    headers?: HttpHeaders
  ): Observable<T> {
    return this.http.post<T>(`${this.basePath}${endpoint}`, body, { headers });
  }

  /**
   * Perform HTTP PUT request
   * @param endpoint - API endpoint (without base path)
   * @param body - Request body
   */
  protected put<T>(endpoint: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.basePath}${endpoint}`, body);
  }

  /**
   * Perform HTTP PATCH request
   * @param endpoint - API endpoint (without base path)
   * @param body - Request body
   */
  protected patch<T>(endpoint: string, body: any): Observable<T> {
    return this.http.patch<T>(`${this.basePath}${endpoint}`, body);
  }

  /**
   * Perform HTTP DELETE request
   * @param endpoint - API endpoint (without base path)
   */
  protected delete<T>(endpoint: string): Observable<T> {
    return this.http.delete<T>(`${this.basePath}${endpoint}`);
  }
}
