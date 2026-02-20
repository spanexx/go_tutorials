import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Home, ArrowLeft, Search } from 'lucide-angular';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent {
  homeIcon = Home;
  backIcon = ArrowLeft;
  searchIcon = Search;

  constructor() {}

  goBack(): void {
    window.history.back();
  }

  goHome(): void {
    window.location.href = '/feed';
  }
}
