import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// CP3 SLA Error Rate Metric
export const errorRate = new Rate('http_errors');

export const options = {
  // CP3 Load Profile: 50 Virtual Users over 3-minute benchmark
  stages: [
    { duration: '30s', target: 50 },  // Ramp-up to 50 VUs
    { duration: '2m', target: 50 },   // Steady-state 50 VUs high-load execution
    { duration: '30s', target: 0 },   // Graceful ramp-down
  ],
  thresholds: {
    // CP3 Performance SLA Criteria:
    // 1. Throughput is stable
    // 2. p95 latency below 200ms
    // 3. p99 latency below 500ms
    // 4. HTTP error rate below 1%
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'http_errors': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8000';

export function setup() {
  // Obtain admin credentials or seed confirmation
  const res = http.get(`${BASE_URL}/api/v1/health`);
  check(res, { 'system healthy': (r) => r.status === 200 });
}

export default function () {
  const rand = Math.random();

  if (rand < 0.45) {
    // Read: Paginated Catalog (Exercising CP3 Query Projection)
    const page = Math.floor(Math.random() * 5) + 1;
    const res = http.get(`${BASE_URL}/api/v1/products?page=${page}&page_size=12`);
    const success = check(res, {
      'catalog status 200': (r) => r.status === 200,
      'has items': (r) => JSON.parse(r.body).items.length > 0,
    });
    errorRate.add(!success);
  } else if (rand < 0.70) {
    // Read: Hardware Category Specification Filter
    const categories = ['cpu', 'gpu', 'ram', 'motherboard', 'monitor', 'laptop'];
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const res = http.get(`${BASE_URL}/api/v1/products?category=${cat}&page_size=10`);
    const success = check(res, {
      'category filter status 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
  } else if (rand < 0.85) {
    // Write: User Registration
    const payload = JSON.stringify({
      email: `k6_${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`,
      first_name: 'K6User',
      last_name: 'Benchmark',
      password: 'Password123!',
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${BASE_URL}/api/v1/users`, payload, params);
    const success = check(res, {
      'registration status 201': (r) => r.status === 201,
    });
    errorRate.add(!success);
  } else {
    // Health / Categories Metadata Check
    const res = http.get(`${BASE_URL}/api/v1/categories`);
    const success = check(res, {
      'categories status 200': (r) => r.status === 200,
    });
    errorRate.add(!success);
  }

  // Paced sleep for stable high-throughput benchmark
  sleep(0.05);
}
