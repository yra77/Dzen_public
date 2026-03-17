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
