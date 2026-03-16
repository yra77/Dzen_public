import { DatePipe } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

import {
  CommentNode,
  CommentsApiService,
  CreateCommentAttachmentRequest
} from '../../core/comments-api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-root-list-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <section class="card">
      <h2>Останні кореневі коментарі</h2>
      <button type="button" (click)="load()" [disabled]="isLoading">Оновити</button>

      <h3>Додати кореневий коментар</h3>
      <form [formGroup]="createForm" (ngSubmit)="submitComment()">
        <label>
          Ім'я
          <input type="text" formControlName="userName" />
        </label>

        <label>
          Email
          <input type="email" formControlName="email" />
        </label>

        <label>
          Homepage
          <input type="url" formControlName="homePage" placeholder="https://example.com" />
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
          <button type="submit" [disabled]="createForm.invalid || isSubmitting">Створити коментар</button>
        </div>

        @if (submitMessage) {
          <p>{{ submitMessage }}</p>
        }
      </form>

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
              @if (comment.attachment) {
                <div class="attachment-inline">
                  @if (comment.attachment.contentType.startsWith('image/')) {
                    <a [href]="getAttachmentUrl(comment.attachment.storagePath)" target="_blank" rel="noreferrer">
                      <img
                        class="attachment-thumb"
                        [src]="getAttachmentUrl(comment.attachment.storagePath)"
                        [alt]="comment.attachment.fileName"
                      />
                    </a>
                  } @else if (comment.attachment.contentType === 'text/plain') {
                    <button type="button" (click)="loadTextAttachment(comment.attachment.storagePath)">
                      Показати txt preview
                    </button>
                    @if (attachmentTextPreviewByPath[comment.attachment.storagePath]) {
                      <pre class="attachment-text">{{ attachmentTextPreviewByPath[comment.attachment.storagePath] }}</pre>
                    }
                  }
                  <small>📎 <a [href]="getAttachmentUrl(comment.attachment.storagePath)" target="_blank" rel="noreferrer">{{ comment.attachment.fileName }}</a></small>
                </div>
              }
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

      .attachment-inline {
        margin-top: 8px;
      }

      .attachment-thumb {
        max-width: 220px;
        max-height: 140px;
        border: 1px solid #d9e0ec;
        border-radius: 6px;
      }

      .attachment-text {
        white-space: pre-wrap;
        background: #f8fafc;
        border: 1px solid #d9e0ec;
        border-radius: 6px;
        padding: 8px;
      }
    `
  ]
})
export class RootListPageComponent implements OnDestroy {
  private readonly commentsApi = inject(CommentsApiService);
  private readonly formBuilder = inject(FormBuilder);

  private signalRConnection: HubConnection | null = null;

  comments: ReadonlyArray<CommentNode> = [];
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  submitMessage = '';
  captchaChallengeId = '';
  captchaImageDataUrl = '';
  textPreviewHtml = '';
  attachmentMessage = '';
  attachment: CreateCommentAttachmentRequest | null = null;
  attachmentTextPreviewByPath: Record<string, string> = {};
  attachmentTextLoadingByPath = new Set<string>();

  readonly createForm = this.formBuilder.nonNullable.group({
    userName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    homePage: ['', [Validators.pattern('https?://.+')]],
    text: ['', [Validators.required, Validators.maxLength(5000)]],
    captchaAnswer: ['', [Validators.required]]
  });

  constructor() {
    this.load();
    this.reloadCaptcha();
    this.initializeSignalR();
  }

  ngOnDestroy(): void {
    if (this.signalRConnection) {
      void this.signalRConnection.stop();
    }
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

  previewText(): void {
    const text = this.createForm.controls.text.value;
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

  submitComment(): void {
    if (this.createForm.invalid || !this.captchaChallengeId) {
      return;
    }

    this.isSubmitting = true;
    this.submitMessage = '';

    const raw = this.createForm.getRawValue();

    this.commentsApi
      .createComment({
        userName: raw.userName,
        email: raw.email,
        homePage: raw.homePage.trim() ? raw.homePage : null,
        text: raw.text,
        parentId: null,
        captchaToken: `${this.captchaChallengeId}:${raw.captchaAnswer}`,
        attachment: this.attachment
      })
      .subscribe({
        next: () => {
          this.submitMessage = 'Коментар успішно створено.';
          this.createForm.reset({
            userName: raw.userName,
            email: raw.email,
            homePage: raw.homePage,
            text: '',
            captchaAnswer: ''
          });
          this.textPreviewHtml = '';
          this.attachment = null;
          this.attachmentMessage = '';
          this.load();
          this.reloadCaptcha();
          this.isSubmitting = false;
        },
        error: () => {
          this.submitMessage = 'Не вдалося створити коментар. Перевірте дані форми.';
          this.reloadCaptcha();
          this.isSubmitting = false;
        }
      });
  }

  getAttachmentUrl(storagePath: string): string {
    const normalizedPath = storagePath.startsWith('/') ? storagePath : `/${storagePath}`;
    return `${environment.apiBaseUrl}${normalizedPath}`;
  }

  loadTextAttachment(storagePath: string): void {
    if (this.attachmentTextPreviewByPath[storagePath] || this.attachmentTextLoadingByPath.has(storagePath)) {
      return;
    }

    this.attachmentTextLoadingByPath.add(storagePath);
    this.commentsApi.getAttachmentText(storagePath).subscribe({
      next: (content) => {
        this.attachmentTextPreviewByPath[storagePath] = content;
        this.attachmentTextLoadingByPath.delete(storagePath);
      },
      error: () => {
        this.attachmentTextPreviewByPath[storagePath] = 'Не вдалося завантажити txt-preview.';
        this.attachmentTextLoadingByPath.delete(storagePath);
      }
    });
  }

  private initializeSignalR(): void {
    this.signalRConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiBaseUrl}/hubs/comments`)
      .withAutomaticReconnect()
      .build();

    this.signalRConnection.on('commentCreated', () => {
      this.load();
    });

    void this.signalRConnection.start();
  }
}
