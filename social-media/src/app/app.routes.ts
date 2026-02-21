import { Routes } from '@angular/router';
import { AppComponent } from './app.component';
import { FeedComponent } from './pages/feed/feed.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { ProfileEditComponent } from './pages/profile/profile-edit/profile-edit.component';
import { ExploreComponent } from './pages/explore/explore.component';
import { MessagesComponent } from './pages/messages/messages.component';
import { NotificationsComponent } from './pages/notifications/notifications.component';
import { BookmarksComponent } from './pages/bookmarks/bookmarks.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { HashtagComponent } from './pages/hashtag/hashtag.component';
import { FollowersComponent } from './pages/followers/followers.component';
import { FollowingComponent } from './pages/following/following.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { VerifyEmailComponent } from './pages/auth/verify-email/verify-email.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { AnalyticsDashboardComponent } from './pages/analytics/analytics-dashboard.component';
import { NotFoundComponent } from './pages/errors/not-found/not-found.component';
import { ErrorPageComponent } from './pages/errors/error-page/error-page.component';
import { authGuard, guestGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'feed', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  { path: 'verify-email', component: VerifyEmailComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [guestGuard] },
  { path: 'feed', component: FeedComponent, canActivate: [authGuard] },
  { path: 'profile/:id', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'profile/:id/edit', component: ProfileEditComponent, canActivate: [authGuard] },
  { path: 'profile/:id/followers', component: FollowersComponent, canActivate: [authGuard] },
  { path: 'profile/:id/following', component: FollowingComponent, canActivate: [authGuard] },
  { path: 'explore', component: ExploreComponent, canActivate: [authGuard] },
  { path: 'messages', component: MessagesComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationsComponent, canActivate: [authGuard] },
  { path: 'bookmarks', component: BookmarksComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: 'analytics', component: AnalyticsDashboardComponent, canActivate: [authGuard] },
  { path: 'hashtag/:tag', component: HashtagComponent, canActivate: [authGuard] },
  { path: '404', component: NotFoundComponent },
  { path: 'error', component: ErrorPageComponent },
  { path: '**', component: NotFoundComponent }
];
