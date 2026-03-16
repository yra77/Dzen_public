import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-thread-page',
  imports: [RouterLink],
  template: `
    <section class="card">
      <h2>Гілка коментаря #{{ commentId }}</h2>
      <p>
        На цьому етапі налаштовано маршрут `/thread/:id`.
        Наступний крок — міграція дерева відповідей, форми reply/preview, captcha та realtime-потоку.
      </p>
      <a routerLink="/">← Назад до списку</a>
    </section>
  `
})
export class ThreadPageComponent {
  private readonly route = inject(ActivatedRoute);

  get commentId(): string {
    return this.route.snapshot.paramMap.get('id') ?? 'unknown';
  }
}
