import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule],
  template: `
    <main class="container">
      <section class="panel">
        <h1 class="text-center">SPA Коментарі</h1>
       <!--<nav class="app-nav">
          <a routerLink="/" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: true }">Головна</a>
        </nav>-->
      </section>

      <router-outlet></router-outlet>
    </main>
  `,
  styles: [
    `
      .app-nav a {
        color: #175cd3;
        text-decoration: none;
        font-weight: 600;
      }

      .app-nav a.is-active {
        text-decoration: underline;
      }
    `
  ]
})
export class AppComponent {}
