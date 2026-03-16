import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CommentNode, CommentsApiService } from '../../core/comments-api.service';

@Component({
  selector: 'app-root-list-page',
  imports: [DatePipe, RouterLink],
  template: `
    <section class="card">
      <h2>Останні кореневі коментарі</h2>
      <button type="button" (click)="load()">Оновити</button>

      @if (isLoading) {
        <p>Завантаження...</p>
      } @else if (errorMessage) {
        <p class="error">{{ errorMessage }}</p>
      } @else if (comments.length === 0) {
        <p>Поки що коментарів немає.</p>
      } @else {
        <ul>
          @for (comment of comments; track comment.id) {
            <li>
              <a [routerLink]="['/thread', comment.id]">#{{ comment.id }} {{ comment.userName }}</a>
              <small>{{ comment.createdAtUtc | date: 'short' }}</small>
              <p>{{ comment.text }}</p>
              <small>Відповідей: {{ comment.replies.length }}</small>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [
    `
      .error {
        color: #b32d2e;
      }

      ul {
        padding: 0;
        list-style: none;
        display: grid;
        gap: 12px;
      }

      li {
        border: 1px solid #d9e0ec;
        border-radius: 8px;
        padding: 12px;
      }

      small {
        display: inline-block;
        margin-top: 8px;
        color: #5f6f85;
      }
    `
  ]
})
export class RootListPageComponent {
  private readonly commentsApi = inject(CommentsApiService);

  comments: ReadonlyArray<CommentNode> = [];
  isLoading = false;
  errorMessage = '';

  constructor() {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.commentsApi.getRootComments().subscribe({
      next: (response) => {
        this.comments = response.items;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Не вдалося завантажити коментарі.';
        this.isLoading = false;
      }
    });
  }
}
