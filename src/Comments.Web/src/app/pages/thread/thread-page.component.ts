import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

import {
  CommentNode,
  CommentsApiService,
  CreateCommentAttachmentRequest
} from '../../core/comments-api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-thread-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, NgTemplateOutlet],
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
          @if (thread.attachment) {
            <p class="attachment-meta">📎 {{ thread.attachment.fileName }} ({{ thread.attachment.contentType }})</p>
          }
        </div>

        <h3>Відповіді</h3>
        @if (thread.replies.length === 0) {
          <p>Ще немає відповідей.</p>
        } @else {
          <ng-container *ngTemplateOutlet="replyTree; context: { $implicit: thread.replies }"></ng-container>
        }

        <ng-template #replyTree let-replies>
          <ul class="tree">
            @for (reply of replies; track reply.id) {
              <li>
                <article class="thread-node">
                  <p class="meta"><strong>{{ reply.userName }}</strong> · {{ reply.createdAtUtc | date: 'short' }}</p>
                  <p>{{ reply.text }}</p>
                  @if (reply.attachment) {
                    <p class="attachment-meta">📎 {{ reply.attachment.fileName }} ({{ reply.attachment.contentType }})</p>
                  }
                </article>

                @if (reply.replies.length > 0) {
                  <ng-container *ngTemplateOutlet="replyTree; context: { $implicit: reply.replies }"></ng-container>
                }
              </li>
            }
          </ul>
        </ng-template>

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
            <textarea rows="5" formControlName="text" (input)="previewText()"></textarea>
          </label>

          @if (textPreviewHtml) {
            <div class="text-preview">
              <div class="text-preview-title">Preview повідомлення</div>
              <div [innerHTML]="textPreviewHtml"></div>
            </div>
          }

          <label>
            Вкладення (png/jpg/gif/txt, до 1MB)
            <input type="file" (change)="onAttachmentSelected($event)" accept=".txt,image/png,image/jpeg,image/gif,text/plain" />
          </label>
          @if (attachmentMessage) {
            <p class="meta">{{ attachmentMessage }}</p>
          }

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
      .error { color: #b32d2e; }
      .meta { color: #5f6f85; }
      .attachment-meta { color: #5f6f85; font-size: 0.9rem; }
      .thread-node { border: 1px solid #d9e0ec; border-radius: 8px; padding: 12px; margin-top: 8px; }
      .tree { list-style: none; margin: 0; padding-left: 12px; }
      form { display: grid; gap: 10px; }
      label { display: grid; gap: 4px; }
      .actions { display: flex; gap: 8px; }
      .captcha { width: 160px; height: 60px; border: 1px solid #d9e0ec; border-radius: 6px; }
      .text-preview { border: 1px solid #d9e0ec; border-radius: 6px; padding: 8px; background: #f8fafc; }
      .text-preview-title { color: #5f6f85; font-size: 0.85rem; margin-bottom: 6px; }
    `
  ]
})
export class ThreadPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly commentsApi = inject(CommentsApiService);
  private readonly formBuilder = inject(FormBuilder);

  private signalRConnection: HubConnection | null = null;

  thread: CommentNode | null = null;
  isLoading = true;
  isSubmitting = false;
  errorMessage = '';
  submitMessage = '';
  captchaChallengeId = '';
  captchaImageDataUrl = '';
  textPreviewHtml = '';
  attachmentMessage = '';
  attachment: CreateCommentAttachmentRequest | null = null;

  readonly replyForm = this.formBuilder.nonNullable.group({
    userName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    text: ['', [Validators.required, Validators.maxLength(5000)]],
    captchaAnswer: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.loadThread();
    this.reloadCaptcha();
    this.initializeSignalR();
  }

  ngOnDestroy(): void {
    if (this.signalRConnection) {
      void this.signalRConnection.stop();
    }
  }

  previewText(): void {
    const text = this.replyForm.controls.text.value;
    if (!text || !text.trim()) {
      this.textPreviewHtml = '';
      return;
    }

    this.commentsApi.previewComment(text).subscribe({
      next: (preview) => {
        this.textPreviewHtml = preview;
      }
    });
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.attachment = null;
    this.attachmentMessage = '';

    if (!file) {
      return;
    }

    if (file.size > 1_000_000) {
      this.attachmentMessage = 'Файл перевищує 1MB.';
      input.value = '';
      return;
    }

    const allowedContentTypes = ['image/png', 'image/jpeg', 'image/gif', 'text/plain'];
    if (!allowedContentTypes.includes(file.type)) {
      this.attachmentMessage = 'Недозволений тип вкладення.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        this.attachmentMessage = 'Не вдалося прочитати файл.';
        return;
      }

      const base64Content = result.includes(',') ? result.split(',')[1] : result;
      this.attachment = {
        fileName: file.name,
        contentType: file.type,
        base64Content
      };
      this.attachmentMessage = `Вкладення готове: ${file.name}`;
    };
    reader.readAsDataURL(file);
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
        attachment: this.attachment
      })
      .subscribe({
        next: () => {
          this.submitMessage = 'Відповідь додано.';
          this.replyForm.reset({ userName: raw.userName, email: raw.email, text: '', captchaAnswer: '' });
          this.textPreviewHtml = '';
          this.attachment = null;
          this.attachmentMessage = '';
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

  private initializeSignalR(): void {
    this.signalRConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiBaseUrl}/hubs/comments`)
      .withAutomaticReconnect()
      .build();

    this.signalRConnection.on('commentCreated', () => {
      this.loadThread();
    });

    void this.signalRConnection.start();
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
