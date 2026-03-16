import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { CommentNode, CommentsApiService } from '../../core/comments-api.service';

@Component({
  selector: 'app-thread-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <h2>Гілка коментаря</h2>
      <a routerLink="/">← Назад до списку</a>

      @if (isLoading) {
        <p>Завантаження гілки...</p>
      } @else if (errorMessage) {
        <p class="error">{{ errorMessage }}</p>
      } @else if (thread) {
        <div class="thread-node">
          <p class="meta"><strong>{{ thread.userName }}</strong> · {{ thread.createdAtUtc | date: 'short' }}</p>
          <p>{{ thread.text }}</p>
        </div>

        <h3>Відповіді</h3>
        @if (thread.replies.length === 0) {
          <p>Ще немає відповідей.</p>
        } @else {
          <ul class="tree">
            @for (reply of thread.replies; track reply.id) {
              <li>
                <article class="thread-node">
                  <p class="meta"><strong>{{ reply.userName }}</strong> · {{ reply.createdAtUtc | date: 'short' }}</p>
                  <p>{{ reply.text }}</p>
                </article>
              </li>
            }
          </ul>
        }

        <h3>Додати відповідь</h3>
        <form [formGroup]="replyForm" (ngSubmit)="submitReply()">
          <label>
            Ім'я
            <input type="text" formControlName="userName" />
          </label>

          <label>
            Email
            <input type="email" formControlName="email" />
          </label>

          <label>
            Текст
            <textarea rows="5" formControlName="text"></textarea>
          </label>

          @if (captchaImageDataUrl) {
            <img [src]="captchaImageDataUrl" alt="Captcha" class="captcha" />
          }

          <label>
            CAPTCHA (сума чисел)
            <input type="text" formControlName="captchaAnswer" />
          </label>

          <div class="actions">
            <button type="button" (click)="reloadCaptcha()">Оновити CAPTCHA</button>
            <button type="submit" [disabled]="replyForm.invalid || isSubmitting">Надіслати reply</button>
          </div>

          @if (submitMessage) {
            <p>{{ submitMessage }}</p>
          }
        </form>
      }
    </section>
  `,
  styles: [
    `
      .error {
        color: #b32d2e;
      }

      .meta {
        color: #5f6f85;
      }

      .thread-node {
        border: 1px solid #d9e0ec;
        border-radius: 8px;
        padding: 12px;
        margin-top: 8px;
      }

      .tree {
        list-style: none;
        margin: 0;
        padding-left: 12px;
      }

      form {
        display: grid;
        gap: 10px;
      }

      label {
        display: grid;
        gap: 4px;
      }

      .actions {
        display: flex;
        gap: 8px;
      }

      .captcha {
        width: 160px;
        height: 60px;
        border: 1px solid #d9e0ec;
        border-radius: 6px;
      }
    `
  ]
})
export class ThreadPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly commentsApi = inject(CommentsApiService);
  private readonly formBuilder = inject(FormBuilder);

  thread: CommentNode | null = null;
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  submitMessage = '';
  captchaChallengeId = '';
  captchaImageDataUrl = '';

  readonly replyForm = this.formBuilder.nonNullable.group({
    userName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    text: ['', [Validators.required, Validators.maxLength(5000)]],
    captchaAnswer: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.loadThread();
    this.reloadCaptcha();
  }

  reloadCaptcha(): void {
    this.commentsApi.getCaptcha().subscribe({
      next: (response) => {
        this.captchaChallengeId = response.challengeId;
        this.captchaImageDataUrl = `data:${response.mimeType};base64,${response.imageBase64}`;
      }
    });
  }

  submitReply(): void {
    if (!this.thread || this.replyForm.invalid || !this.captchaChallengeId) {
      return;
    }

    this.isSubmitting = true;
    this.submitMessage = '';

    const raw = this.replyForm.getRawValue();

    this.commentsApi
      .createComment({
        userName: raw.userName,
        email: raw.email,
        homePage: null,
        text: raw.text,
        parentId: this.thread.id,
        captchaToken: `${this.captchaChallengeId}:${raw.captchaAnswer}`,
        attachment: null
      })
      .subscribe({
        next: () => {
          this.submitMessage = 'Відповідь додано.';
          this.replyForm.controls.text.reset('');
          this.replyForm.controls.captchaAnswer.reset('');
          this.loadThread();
          this.reloadCaptcha();
          this.isSubmitting = false;
        },
        error: () => {
          this.submitMessage = 'Не вдалося надіслати відповідь. Перевірте дані форми.';
          this.reloadCaptcha();
          this.isSubmitting = false;
        }
      });
  }

  private loadThread(): void {
    const commentId = this.route.snapshot.paramMap.get('id');
    if (!commentId) {
      this.errorMessage = 'Некоректний id коментаря.';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.commentsApi.getThread(commentId).subscribe({
      next: (response) => {
        this.thread = response;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Не вдалося завантажити гілку.';
        this.isLoading = false;
      }
    });
  }
}
