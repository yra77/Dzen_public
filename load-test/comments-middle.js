import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const API_MODE = (__ENV.API_MODE || 'rest').toLowerCase(); // rest | graphql | mixed
const CAPTCHA_TOKEN = __ENV.CAPTCHA_TOKEN || 'test';

const createLatency = new Trend('create_latency_ms');
const listLatency = new Trend('list_latency_ms');
const searchLatency = new Trend('search_latency_ms');
const graphqlLatency = new Trend('graphql_latency_ms');
const createFailed = new Rate('create_failed_rate');

export const options = {
  discardResponseBodies: false,
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<700', 'p(99)<1200'],
    create_latency_ms: ['p(95)<900'],
    list_latency_ms: ['p(95)<500'],
    search_latency_ms: ['p(95)<650'],
    graphql_latency_ms: ['p(95)<700'],
    create_failed_rate: ['rate<0.05'],
  },
  scenarios: {
    browse_rest: {
      executor: 'ramping-vus',
      exec: 'browseRest',
      startVUs: 2,
      stages: [
        { duration: '30s', target: 15 },
        { duration: '1m', target: 30 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
    create_comments: {
      executor: 'constant-arrival-rate',
      exec: 'createCommentFlow',
      startTime: '10s',
      rate: 3,
      timeUnit: '1s',
      duration: '90s',
      preAllocatedVUs: 6,
      maxVUs: 20,
    },
    search_traffic: {
      executor: 'constant-vus',
      exec: 'searchFlow',
      vus: 8,
      duration: '80s',
      startTime: '20s',
    },
    graphql_traffic: {
      executor: 'constant-vus',
      exec: 'graphqlFlow',
      vus: 6,
      duration: '70s',
      startTime: '30s',
    },
  },
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createPayload() {
  const n = `${__VU}-${Date.now()}-${randomInt(10, 9999)}`;
  return {
    userName: `user${n}`,
    email: `user${n}@example.com`,
    homePage: 'https://example.com',
    text: `<strong>Load test ${n}</strong> with <i>tag</i> and <code>code</code>`,
    captchaToken: CAPTCHA_TOKEN,
  };
}

export function browseRest() {
  if (API_MODE === 'graphql') {
    sleep(0.2);
    return;
  }

  group('REST list page', () => {
    const page = randomInt(1, 3);
    const res = http.get(`${BASE_URL}/api/comments?page=${page}&pageSize=25&sortBy=CreatedAt&sortDirection=Desc`);
    listLatency.add(res.timings.duration);
    check(res, {
      'REST list status 200': (r) => r.status === 200,
      'REST list has payload': (r) => (r.body || '').length > 0,
    });
  });

  sleep(Math.random() * 1.2);
}

export function createCommentFlow() {
  if (API_MODE === 'graphql') {
    return createViaGraphql();
  }
  return createViaRest();
}

function createViaRest() {
  group('REST create comment', () => {
    const payload = JSON.stringify(createPayload());
    const res = http.post(`${BASE_URL}/api/comments`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    createLatency.add(res.timings.duration);
    const ok = check(res, {
      'REST create status 201': (r) => r.status === 201,
    });

    createFailed.add(!ok);

  });

  sleep(Math.random() * 0.6);
}

function createViaGraphql() {
  group('GraphQL create comment', () => {
    const payload = createPayload();
    const query = `
      mutation AddComment($input: CreateCommentInput!) {
        addComment(input: $input) {
          id
          userName
        }
      }
    `;

    const res = http.post(
      `${BASE_URL}/graphql`,
      JSON.stringify({
        query,
        variables: {
          input: {
            userName: payload.userName,
            email: payload.email,
            homePage: payload.homePage,
            text: payload.text,
            captchaToken: payload.captchaToken,
          },
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    graphqlLatency.add(res.timings.duration);
    const ok = check(res, {
      'GraphQL create status 200': (r) => r.status === 200,
      'GraphQL create no errors': (r) => !(r.body || '').includes('"errors"'),
    });

    createFailed.add(!ok);
  });

  sleep(Math.random() * 0.5);
}

export function searchFlow() {
  if (API_MODE === 'graphql') {
    sleep(0.2);
    return;
  }

  group('REST search', () => {
    const q = encodeURIComponent('load');
    const res = http.get(`${BASE_URL}/api/comments/search?q=${q}&page=1&pageSize=20`);
    searchLatency.add(res.timings.duration);

    check(res, {
      'REST search status 200': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 0.7);
}

export function graphqlFlow() {
  if (API_MODE === 'rest') {
    sleep(0.2);
    return;
  }

  group('GraphQL list/search', () => {
    const query = `
      query CommentsPage {
        commentsPage(page: 1, pageSize: 25, sortBy: CREATED_AT, sortDirection: DESC) {
          page
          pageSize
          totalCount
          items {
            id
            userName
            createdAt
          }
        }
      }
    `;

    const res = http.post(
      `${BASE_URL}/graphql`,
      JSON.stringify({ query }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    graphqlLatency.add(res.timings.duration);
    check(res, {
      'GraphQL list status 200': (r) => r.status === 200,
      'GraphQL list no errors': (r) => !(r.body || '').includes('"errors"'),
    });
  });

  sleep(Math.random() * 0.8);
}
