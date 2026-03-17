import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HubConnectionBuilder } from '@microsoft/signalr';

import { RootListPageComponent } from './root-list-page.component';

/**
 * Легка тестова реалізація HubConnection для керування realtime callback-ами у smoke-тестах.
 */
class FakeHubConnection {
  private reconnectingHandler: (() => void) | null = null;
  private reconnectedHandler: (() => void) | null = null;
  private closeHandler: (() => void) | null = null;

  /** Реєструє callback на подію з'єднання (у тестах не використовується). */
  on(): void {
    // no-op для smoke-сценаріїв.
  }

  /** Реєструє callback для стану reconnecting. */
  onreconnecting(handler: () => void): void {
    this.reconnectingHandler = handler;
  }

  /** Реєструє callback для стану reconnected. */
  onreconnected(handler: () => void): void {
    this.reconnectedHandler = handler;
  }

  /** Реєструє callback для стану close. */
  onclose(handler: () => void): void {
    this.closeHandler = handler;
  }

  /** Емулює успішний старт realtime-з'єднання. */
  start(): Promise<void> {
    return Promise.resolve();
  }

  /** Емулює зупинку realtime-з'єднання. */
  stop(): Promise<void> {
    return Promise.resolve();
  }

  /** Примусово викликає callback reconnecting. */
  emitReconnecting(): void {
    this.reconnectingHandler?.();
  }

  /** Примусово викликає callback reconnected. */
  emitReconnected(): void {
    this.reconnectedHandler?.();
  }

  /** Примусово викликає callback close. */
  emitClosed(): void {
    this.closeHandler?.();
  }
}

describe('RootListPageComponent smoke', () => {
  let fixture: ComponentFixture<RootListPageComponent>;
  let component: RootListPageComponent;
  let httpMock: HttpTestingController;
  let fakeHub: FakeHubConnection;

  beforeEach(async () => {
    fakeHub = new FakeHubConnection();
    spyOn(HubConnectionBuilder.prototype, 'withUrl').and.returnThis();
    spyOn(HubConnectionBuilder.prototype, 'withAutomaticReconnect').and.returnThis();
    spyOn(HubConnectionBuilder.prototype, 'build').and.returnValue(fakeHub as never);

    await TestBed.configureTestingModule({
      imports: [RootListPageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RootListPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('завантажує root-коментарі та captcha при ініціалізації', () => {
    const commentsRequest = httpMock.expectOne('http://localhost:8080/api/comments');
    expect(commentsRequest.request.method).toBe('GET');
    commentsRequest.flush({ page: 1, pageSize: 25, totalCount: 0, items: [] });

    const captchaRequest = httpMock.expectOne('http://localhost:8080/api/captcha/image');
    expect(captchaRequest.request.method).toBe('GET');
    captchaRequest.flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    expect(component.comments.length).toBe(0);
    expect(component.captchaChallengeId).toBe('captcha-1');
  });

  it('показує fallback-повідомлення коли preview тимчасово недоступний', () => {
    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 0, items: [] });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    component.createForm.controls.text.setValue('demo preview text');
    component.previewText();

    const previewRequest = httpMock.expectOne('http://localhost:8080/api/comments/preview');
    previewRequest.flush('temporary fail', { status: 503, statusText: 'Service unavailable' });

    expect(component.previewMessage).toContain('Preview тимчасово недоступний');
  });

  it('створює root-коментар із captchaToken у форматі challenge:answer', () => {
    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 0, items: [] });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    component.createForm.setValue({
      userName: 'Smoke User',
      email: 'smoke@example.com',
      homePage: 'https://example.com',
      text: 'Smoke root comment',
      captchaAnswer: '9'
    });

    component.submitComment();

    const createRequest = httpMock.expectOne('http://localhost:8080/api/comments');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body.parentId).toBeNull();
    expect(createRequest.request.body.captchaToken).toBe('captcha-1:9');
    createRequest.flush({ id: 'r-1' });

    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 1, items: [] });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-2', imageBase64: 'BBBB', mimeType: 'image/png', ttlSeconds: 60 });

    expect(component.submitMessage).toContain('успішно створено');
  });

  /** Перевіряє, що txt-вкладення коректно передається у create payload. */
  it('додає txt-вкладення до payload створення root-коментаря', () => {
    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 0, items: [] });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    component.attachment = {
      fileName: 'note.txt',
      contentType: 'text/plain',
      base64Content: 'SGVsbG8='
    };

    component.createForm.setValue({
      userName: 'Smoke User',
      email: 'smoke@example.com',
      homePage: '',
      text: 'Root with attachment',
      captchaAnswer: '4'
    });

    component.submitComment();

    const createRequest = httpMock.expectOne('http://localhost:8080/api/comments');
    expect(createRequest.request.body.attachment).toEqual({
      fileName: 'note.txt',
      contentType: 'text/plain',
      base64Content: 'SGVsbG8='
    });
    createRequest.flush({ id: 'r-2' });

    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 1, items: [] });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-2', imageBase64: 'BBBB', mimeType: 'image/png', ttlSeconds: 60 });

    expect(component.submitMessage).toContain('успішно створено');
  });

  /** Перевіряє, що форма блокує вкладення, які перевищують ліміт 1MB. */
  it('відхиляє вкладення розміром більше 1MB', () => {
    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 0, items: [] });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    const fileInput = document.createElement('input');
    Object.defineProperty(fileInput, 'files', {
      value: [new File([new Uint8Array(1_000_001)], 'big.txt', { type: 'text/plain' })]
    });

    component.onAttachmentSelected({ target: fileInput } as unknown as Event);

    expect(component.attachment).toBeNull();
    expect(component.attachmentMessage).toContain('перевищує 1MB');
  });

  /** Перевіряє, що форма блокує невалідні типи вкладень. */
  it('відхиляє вкладення з недозволеним content-type', () => {
    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 0, items: [] });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    const fileInput = document.createElement('input');
    Object.defineProperty(fileInput, 'files', {
      value: [new File(['pdf-body'], 'file.pdf', { type: 'application/pdf' })]
    });

    component.onAttachmentSelected({ target: fileInput } as unknown as Event);

    expect(component.attachment).toBeNull();
    expect(component.attachmentMessage).toContain('Недозволений тип');
  });



  it('показує preview для вибраного image-вкладення', () => {
    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 0, items: [] });
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
      value: [new File(['fake-image'], 'img.png', { type: 'image/png' })]
    });

    component.onAttachmentSelected({ target: fileInput } as unknown as Event);

    expect(component.attachmentImagePreviewDataUrl).toContain('data:image/png;base64');
  });

  it('додає quick-тег [strong] у текст форми', () => {
    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 0, items: [] });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    const textArea = document.createElement('textarea');
    textArea.value = 'demo';
    textArea.setSelectionRange(0, 4);

    component.insertQuickTag('strong', textArea);

    expect(component.createForm.controls.text.value).toBe('<strong>demo</strong>');
  });

    it('оновлює SignalR статуси reconnecting/reconnected/close', () => {
    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 0, items: [] });
    httpMock.expectOne('http://localhost:8080/api/captcha/image').flush({ challengeId: 'captcha-1', imageBase64: 'AAAA', mimeType: 'image/png', ttlSeconds: 60 });

    fakeHub.emitReconnecting();
    expect(component.signalRStatusMessage).toContain('перепідключення');

    fakeHub.emitReconnected();
    httpMock.expectOne('http://localhost:8080/api/comments').flush({ page: 1, pageSize: 25, totalCount: 0, items: [] });
    expect(component.signalRStatusMessage).toContain('відновлено');

    fakeHub.emitClosed();
    expect(component.signalRStatusMessage).toContain('Realtime недоступний');
  });
});
