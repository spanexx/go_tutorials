import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PostService, Post } from '../../shared/services/post.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';

@Component({
  selector: 'app-post',
  standalone: true,
  imports: [CommonModule, PostCardComponent],
  template: `
    <div class="post-page">
      @if (isLoading) {
        <div class="loading">Loading...</div>
      } @else if (error) {
        <div class="error">{{ error }}</div>
      } @else if (post) {
        <app-post-card [post]="post"></app-post-card>
      }
    </div>
  `,
  styles: [`
    .post-page { max-width: 720px; margin: 0 auto; padding: 1rem; }
    .loading, .error { padding: 1rem; }
  `]
})
export class PostComponent implements OnInit {
  post: Post | null = null;
  isLoading = false;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private postService: PostService) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error = 'Post not found';
      return;
    }

    this.isLoading = true;
    try {
      this.post = await firstValueFrom(this.postService.getPost(id));
    } catch {
      this.error = 'Failed to load post';
    } finally {
      this.isLoading = false;
    }
  }
}
