import { Routes } from '@angular/router';

import { RootListPageComponent } from './pages/root-list/root-list-page.component';
import { ThreadPageComponent } from './pages/thread/thread-page.component';

export const routes: Routes = [
  { path: '', component: RootListPageComponent },
  { path: 'thread/:id', component: ThreadPageComponent },
  { path: '**', redirectTo: '' }
];
