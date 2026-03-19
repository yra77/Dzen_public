import { ApplicationConfig, inject } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { InMemoryCache } from '@apollo/client/core';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter(routes),
    provideApollo(() => {
      /** Apollo HttpLink для централізованої роботи Angular SPA з GraphQL endpoint. */
      const httpLink = inject(HttpLink);
      return {
        link: httpLink.create({ uri: `${environment.apiBaseUrl}/graphql` }),
        cache: new InMemoryCache()
      };
    })
  ]
};
