import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

export interface CacheEntry {
    url: string;
    response: HttpResponse<any>;
    entryTime: number;
}

/**
 * CacheService
 * 
 * Provides a generic caching layer for HTTP GET requests.
 * Allows storing responses with an optional TTL (Time To Live).
 */
@Injectable({
    providedIn: 'root'
})
export class CacheService {
    private cache = new Map<string, CacheEntry>();

    // Default TTL: 5 minutes in milliseconds
    private readonly DEFAULT_TTL = 5 * 60 * 1000;

    constructor() { }

    /**
     * Store a response in the cache
     * @param url The request URL to use as the cache key
     * @param response The HTTP response to cache
     */
    put(url: string, response: HttpResponse<any>): void {
        const entry: CacheEntry = {
            url,
            response,
            entryTime: Date.now()
        };
        this.cache.set(url, entry);
    }

    /**
     * Retrieve a response from the cache
     * @param url The request URL to fetch from cache
     * @param maxAge Optional maximum age in milliseconds. Defaults to 5 minutes.
     * @returns The cached HttpResponse, or null if not found or expired
     */
    get(url: string, maxAge: number = this.DEFAULT_TTL): HttpResponse<any> | null {
        const entry = this.cache.get(url);

        if (!entry) {
            return null;
        }

        const isExpired = (Date.now() - entry.entryTime) > maxAge;

        if (isExpired) {
            this.cache.delete(url);
            return null;
        }

        return entry.response;
    }

    /**
     * Invalidate a specific cache entry
     * @param url The request URL to remove from cache
     */
    invalidate(url: string): void {
        this.cache.delete(url);
    }

    /**
     * Clear the entire cache
     */
    clear(): void {
        this.cache.clear();
    }
}
