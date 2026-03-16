import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '15s',
};

export default function () {
  const res = http.get('http://localhost:5000/api/comments?page=1&pageSize=10');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
