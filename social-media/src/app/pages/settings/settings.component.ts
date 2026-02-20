import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Moon, Sun, Bell, User, Shield, Palette, Monitor } from 'lucide-angular';
import { ThemeService } from '../../shared/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  sunIcon = Sun;
  moonIcon = Moon;
  bellIcon = Bell;
  userIcon = User;
  shieldIcon = Shield;
  paletteIcon = Palette;
  monitorIcon = Monitor;

  notifications = {
    likes: true,
    comments: true,
    shares: true,
    follows: true,
    mentions: true
  };

  privacy = {
    privateAccount: false,
    showActivity: true,
    allowMessages: 'everyone'
  };

  constructor(public themeService: ThemeService) {}

  get currentTheme(): 'light' | 'dark' {
    return this.themeService.getTheme();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.themeService.setTheme(theme);
  }
}
