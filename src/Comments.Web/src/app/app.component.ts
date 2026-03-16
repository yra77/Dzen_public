import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="page-shell">
      <h1>Comments SPA</h1>
      <nav>
        <a routerLink="/">Головна</a>
      </nav>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [
    `
      h1 {
        margin: 0 0 12px;
      }

      nav {
        margin-bottom: 16px;
      }

      a {
        color: #2255d8;
      }
    `
  ]
})
export class AppComponent {}
