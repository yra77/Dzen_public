import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HubConnectionBuilder } from '@microsoft/signalr';

import { ThreadPageComponent } from './thread-page.component';

/**
 * Тестовий ActivatedRoute snapshot з id гілки для smoke-перевірок сторінки thread.
 */
const fakeActivatedRoute = {
  snapshot: {
    paramMap: convertToParamMap({ id: 'root-100' })
  }
};

/**
 * Мінімальна тестова реалізація HubConnection для перевірки realtime UX статусів.
 */
class FakeHubConnection {
  private reconnectingHandler: (() => void) | null = null;
  private closeHandler: (() => void) | null = null;

  /** Реєстрація callback-ів для signalr подій (подія коментаря не потрібна в цих тестах). */
  on(): void {
    // no-op.
  }

  /** Реєструє callback reconnecting. */
  onreconnecting(handler: () => void): void {
    this.reconnectingHandler = handler;
  }

  /** Реєструє callback reconnected (у цьому тесті не використовується). */
  onreconnected(): void {
    // no-op.
  }

  /** Реєструє callback close. */
  onclose(handler: () => void): void {
    this.closeHandler = handler;
  }

  /** Емулює успішний запуск з'єднання. */
  start(): Promise<void> {
    return Promise.resolve();
  }

  /** Емулює зупинку з'єднання. */
  stop(): Promise<void> {
    return Promise.resolve();
  }

  /** Примусово викликає reconnecting callback. */
  emitReconnecting(): void {
    this.reconnectingHandler?.();
  }

  /** Примусово викликає close callback. */
  emitClosed(): void {
    this.closeHandler?.();
  }
}

describe('ThreadPageComponent smoke', () => {
  let fixture: ComponentFixture<ThreadPageComponent>;
  let component: ThreadPageComponent;
  let httpMock: HttpTestingController;
  let fakeHub: FakeHubConnection;

  beforeEach(async () => {
    fakeHub = new FakeHubConnection();
    spyOn(HubConnectionBuilder.prototype, 'withUrl').and.returnThis();
    spyOn(HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnThis();
    spyOn(HubConnectionBuilder.prototype, 'build').and.returnValue(fakeHub as never);

    await TestBed.configureTestingModule({
      imports: [ThreadPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: fakeActivatedRoute }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ThreadPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('завантажує гілку та captcha при ініціалізації', () => {
    httpMock.expectOne('http://localhost:8080/api/comments/root-100/thread').flush({
      id: 'root-100',
      parentId: null,
      userName: 'Root',
      email: 'root@example.com',
      homePage: null,
      text: 'Root text',
      createdAtUtc: '2026-03-17T10:00:00Z',
      attachment: null,
      replies: []
    });

    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    expect(component.thread?.id).toBe('root-100');
    expect(component.captchaChallengeId).toBe('captcha-1');
  });

  it('надсилає reply з parentId поточної гілки', () => {
    httpMock.expectOne('http://localhost:8080/api/comments/root-100/thread').flush({
      id: 'root-100',
      parentId: null,
      userName: 'Root',
      email: 'root@example.com',
      homePage: null,
      text: 'Root text',
      createdAtUtc: '2026-03-17T10:00:00Z',
      attachment: null,
      replies: []
    });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    component.replyForm.setValue({
      userName: 'Reply User',
      email: 'reply@example.com',
      text: 'Reply text',
      captchaAnswer: '7'
    });

    component.submitReply();

    const createRequest = httpMock.expectOne('http://localhost:8080/api/comments');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body.parentId).toBe('root-100');
    expect(createRequest.request.body.captchaToken).toBe('captcha-1:7');
    createRequest.flush({ id: 'reply-1' });

    httpMock.expectOne('http://localhost:8080/api/comments/root-100/thread').flush({
      id: 'root-100',
      parentId: null,
      userName: 'Root',
      email: 'root@example.com',
      homePage: null,
      text: 'Root text',
      createdAtUtc: '2026-03-17T10:00:00Z',
      attachment: null,
      replies: [{
        id: 'reply-1',
        parentId: 'root-100',
        userName: 'Reply User',
        email: 'reply@example.com',
        homePage: null,
        text: 'Reply text',
        createdAtUtc: '2026-03-17T10:01:00Z',
        attachment: null,
        replies: []
      }]
    });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-2', imageBase64: 'BBBB', mimeType: 'image/png', ttlSeconds: 60 });

    expect(component.submitMessage).toContain('Відповідь додано');
  });


  /** Перевіряє, що вкладення передається у payload при створенні reply. */
  it('надсилає reply з txt-вкладенням', () => {
    httpMock.expectOne('http://localhost:8080/api/comments/root-100/thread').flush({
      id: 'root-100',
      parentId: null,
      userName: 'Root',
      email: 'root@example.com',
      homePage: null,
      text: 'Root text',
      createdAtUtc: '2026-03-17T10:00:00Z',
      attachment: null,
      replies: []
    });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    component.attachment = {
      fileName: 'reply.txt',
      contentType: 'text/plain',
      base64Content: 'UmVwbHk='
    };

    component.replyForm.setValue({
      userName: 'Reply User',
      email: 'reply@example.com',
      text: 'Reply with attachment',
      captchaAnswer: '7'
    });

    component.submitReply();

    const createRequest = httpMock.expectOne('http://localhost:8080/api/comments');
    expect(createRequest.request.body.attachment).toEqual({
      fileName: 'reply.txt',
      contentType: 'text/plain',
      base64Content: 'UmVwbHk='
    });
    createRequest.flush({ id: 'reply-2' });

    httpMock.expectOne('http://localhost:8080/api/comments/root-100/thread').flush({
      id: 'root-100',
      parentId: null,
      userName: 'Root',
      email: 'root@example.com',
      homePage: null,
      text: 'Root text',
      createdAtUtc: '2026-03-17T10:00:00Z',
      attachment: null,
      replies: []
    });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-2', imageBase64: 'BBBB', mimeType: 'image/png', ttlSeconds: 60 });

    expect(component.submitMessage).toContain('Відповідь додано');
  });

  /** Перевіряє, що reply-форма блокує вкладення, які перевищують ліміт 1MB. */
  it('відхиляє reply-вкладення розміром більше 1MB', () => {
    httpMock.expectOne('http://localhost:8080/api/comments/root-100/thread').flush({
      id: 'root-100',
      parentId: null,
      userName: 'Root',
      email: 'root@example.com',
      homePage: null,
      text: 'Root text',
      createdAtUtc: '2026-03-17T10:00:00Z',
      attachment: null,
      replies: []
    });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    const fileInput = document.createElement('input');
    Object.defineProperty(fileInput, 'files', {
      value: [new File([new Uint8Array(1_000_001)], 'big.txt', { type: 'text/plain' })]
    });

    component.onAttachmentSelected({ target: fileInput } as unknown as Event);

    expect(component.attachment).toBeNull();
    expect(component.attachmentMessage).toContain('перевищує 1MB');
  });

  /** Перевіряє, що reply-форма блокує невалідні типи вкладень. */
  it('відхиляє reply-вкладення з недозволеним content-type', () => {
    httpMock.expectOne('http://localhost:8080/api/comments/root-100/thread').flush({
      id: 'root-100',
      parentId: null,
      userName: 'Root',
      email: 'root@example.com',
      homePage: null,
      text: 'Root text',
      createdAtUtc: '2026-03-17T10:00:00Z',
      attachment: null,
      replies: []
    });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    const fileInput = document.createElement('input');
    Object.defineProperty(fileInput, 'files', {
      value: [new File(['pdf-body'], 'file.pdf', { type: 'application/pdf' })]
    });

    component.onAttachmentSelected({ target: fileInput } as unknown as Event);

    expect(component.attachment).toBeNull();
    expect(component.attachmentMessage).toContain('Недозволений тип');
  });




  it('показує preview для вибраного image-вкладення у reply-формі', () => {
    httpMock.expectOne('http://localhost:8080/api/comments/root-100/thread').flush({
      id: 'root-100',
      parentId: null,
      userName: 'Root',
      email: 'root@example.com',
      homePage: null,
      text: 'Root text',
      createdAtUtc: '2026-03-17T10:00:00Z',
      attachment: null,
      replies: []
    });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    spyOn(window as never, 'FileReader').and.returnValue({
      result: 'data:image/png;base64,ZmFrZQ==',
      onload: null,
      readAsDataURL(this: { onload: null | (() => void) }) {
        this.onload?.();
      }
    } as FileReader);

    const fileInput = document.createElement('input');
    Object.defineProperty(fileInput, 'files', {
      value: [new File(['fake-image'], 'reply.png', { type: 'image/png' })]
    });

    component.onAttachmentSelected({ target: fileInput } as unknown as Event);

    expect(component.attachmentImagePreviewDataUrl).toContain('data:image/png;base64');
  });

  it('додає quick-тег [code] у текст reply-форми', () => {
    httpMock.expectOne('http://localhost:8080/api/comments/root-100/thread').flush({
      id: 'root-100',
      parentId: null,
      userName: 'Root',
      email: 'root@example.com',
      homePage: null,
      text: 'Root text',
      createdAtUtc: '2026-03-17T10:00:00Z',
      attachment: null,
      replies: []
    });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    const textArea = document.createElement('textarea');
    textArea.value = 'snippet';
    textArea.setSelectionRange(0, 7);

    component.insertQuickTag('code', textArea);

    expect(component.replyForm.controls.text.value).toBe('<code>snippet</code>');
  });


    it('показує realtime fallback-повідомлення при розриві зʼєднання', () => {
    httpMock.expectOne('http://localhost:8080/api/comments/root-100/thread').flush({
      id: 'root-100',
      parentId: null,
      userName: 'Root',
      email: 'root@example.com',
      homePage: null,
      text: 'Root text',
      createdAtUtc: '2026-03-17T10:00:00Z',
      attachment: null,
      replies: []
    });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    fakeHub.emitReconnecting();
    expect(component.signalRStatusMessage).toContain('перепідключення');

    fakeHub.emitClosed();
    expect(component.signalRStatusMessage).toContain('Realtime недоступний');
  });
});
