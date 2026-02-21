// Code Map: user.service.ts
// - UserService: Service for fetching user data from backend API
// - Provides methods to get user profiles by ID
// - Extends BaseApiService for consistent API handling
// CID: Phase-2 Milestone 2.5 - Social Graph (Follow System)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  is_verified?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService extends BaseApiService {
  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Get user profile by ID
   */
  getUserById(userId: string): Observable<UserProfile> {
    return this.get<UserProfile>(`/users/${userId}`);
  }

  /**
   * Get multiple users by their IDs
   */
  getUsersByIds(userIds: string[]): Observable<UserProfile[]> {
    return this.get<UserProfile[]>('/users', { ids: userIds.join(',') });
  }

  /**
   * Get current user's profile
   */
  getCurrentUser(): Observable<UserProfile> {
    return this.get<UserProfile>('/users/me');
  }
}
