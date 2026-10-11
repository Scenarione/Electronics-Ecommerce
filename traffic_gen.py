"""CP2 Concurrent Traffic Generator (Zero-Downtime Validation).

Sends continuous POST and GET requests at >= 20 requests/second.
Tracks:
- 0 HTTP 5xx Server Errors.
- 0 Data Corruption or Missing Field exceptions.
- Latency percentiles (p50, p95, p99 < 500ms).

Built with Python standard library (urllib.request) so it requires 0 external dependencies.
"""

import argparse
import json
import random
import sys
import time
import urllib.error
import urllib.request
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from uuid import uuid4

FIRST_NAMES = ["Somchai", "Somsak", "Arthit", "Kanya", "Niran", "Warinthon", "Methas", "Haruto", "Komet", "Ananda", "Chatchai", "Ploy", "Dao"]
LAST_NAMES = ["Prasert", "Suksawat", "Ruttanaburee", "Tosak", "Sasison", "Aburatani", "Wongsuwan", "Boonmee", "Saelao", "Thongchai"]


class TrafficMetrics:
    def __init__(self):
        self.lock = Lock()
        self.total_requests = 0
        self.status_2xx = 0
        self.status_4xx = 0
        self.status_5xx = 0
        self.missing_fields = 0
        self.latencies = deque(maxlen=5000)
        self.created_user_ids = deque(maxlen=200)

    def record(self, status_code: int, latency_ms: float, has_missing_field: bool = False, user_id: str | None = None):
        with self.lock:
            self.total_requests += 1
            if 200 <= status_code < 300:
                self.status_2xx += 1
            elif 400 <= status_code < 500:
                self.status_4xx += 1
            elif status_code >= 500:
                self.status_5xx += 1
            else:
                self.status_5xx += 1

            if has_missing_field:
                self.missing_fields += 1

            self.latencies.append(latency_ms)
            if user_id:
                self.created_user_ids.append(user_id)

    def get_stats(self):
        with self.lock:
            lats = sorted(self.latencies) if self.latencies else [0]
            n = len(lats)
            p50 = lats[int(n * 0.50)] if n > 0 else 0
            p95 = lats[int(n * 0.95)] if n > 0 else 0
            p99 = lats[int(n * 0.99)] if n > 0 else 0
            avg = sum(lats) / n if n > 0 else 0

            return {
                "total": self.total_requests,
                "2xx": self.status_2xx,
                "4xx": self.status_4xx,
                "5xx": self.status_5xx,
                "missing": self.missing_fields,
                "p50": p50,
                "p95": p95,
                "p99": p99,
                "avg": avg,
            }

    def get_random_user_id(self) -> str | None:
        with self.lock:
            if self.created_user_ids:
                return random.choice(self.created_user_ids)
        return None


def http_request(url: str, method: str = "GET", data: dict | None = None, timeout: float = 2.0) -> tuple[int, dict | None]:
    """Execute standard library HTTP request."""
    encoded_data = json.dumps(data).encode("utf-8") if data else None
    headers = {"Content-Type": "application/json"} if data else {}
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            body = resp.read().decode("utf-8")
            try:
                parsed = json.loads(body) if body else None
            except Exception:
                parsed = None
            return status, parsed
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body) if body else None
        except Exception:
            parsed = None
        return e.code, parsed
    except (urllib.error.URLError, TimeoutError):
        return 503, None
    except Exception:
        return 500, None


def execute_request(base_url: str, metrics: TrafficMetrics):
    """Execute a single randomized traffic request (POST or GET) and validate integrity."""
    route_choice = random.random()
    t0 = time.time()
    status_code = 0
    missing = False
    new_user_id = None

    if route_choice < 0.35:
        # POST /api/v1/users (Write traffic exercising name splitting / dual-write)
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        payload = {
            "email": f"traffic_{uuid4().hex[:10]}@example.com",
            "password": "Password123!",
        }
        # Alternate between legacy 'name' payload and new 'first_name'/'last_name' payload
        if random.random() < 0.5:
            payload["name"] = f"{first} {last}"
        else:
            payload["first_name"] = first
            payload["last_name"] = last

        status_code, res_json = http_request(f"{base_url}/api/v1/users", method="POST", data=payload)
        if status_code == 201 and res_json:
            user_data = res_json.get("user", {})
            new_user_id = user_data.get("id")
            if not user_data.get("name") and not user_data.get("first_name"):
                missing = True

    elif route_choice < 0.70:
        # GET /api/v1/users/{id} (Read traffic verifying continuous profile accessibility)
        target_id = metrics.get_random_user_id()
        if target_id:
            status_code, res_json = http_request(f"{base_url}/api/v1/users/{target_id}", method="GET")
            if status_code == 200 and res_json:
                if not res_json.get("id") or (not res_json.get("name") and not res_json.get("first_name")):
                    missing = True
        else:
            status_code, _ = http_request(f"{base_url}/api/v1/products?page_size=5", method="GET")

    elif route_choice < 0.90:
        # GET /api/v1/products (Catalog browsing)
        page = random.randint(1, 10)
        status_code, _ = http_request(f"{base_url}/api/v1/products?page={page}&page_size=10", method="GET")

    else:
        # GET /api/v1/health (Health check)
        status_code, _ = http_request(f"{base_url}/api/v1/health", method="GET")

    latency_ms = (time.time() - t0) * 1000.0
    metrics.record(status_code, latency_ms, missing, new_user_id)


def run_traffic(base_url: str, target_rps: float = 25.0, duration_sec: int | None = None, workers: int = 8):
    """Run concurrent load generator."""
    metrics = TrafficMetrics()
    print("=" * 75)
    print("CP2 ZERO-DOWNTIME CONCURRENT TRAFFIC GENERATOR")
    print(f"Target: {base_url} | Target RPS: {target_rps} | Workers: {workers}")
    print("Criteria: 0 HTTP 5xx | 0 Missing Fields | P99 Latency < 500ms")
    print("=" * 75)

    start_time = time.time()
    last_print = start_time
    prev_total = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        try:
            while True:
                now = time.time()
                elapsed = now - start_time
                if duration_sec and elapsed >= duration_sec:
                    break

                batch_size = max(1, int(target_rps / 5))
                for _ in range(batch_size):
                    executor.submit(execute_request, base_url, metrics)

                time.sleep(batch_size / target_rps)

                if now - last_print >= 1.0:
                    stats = metrics.get_stats()
                    curr_rps = (stats["total"] - prev_total) / (now - last_print)
                    prev_total = stats["total"]
                    last_print = now

                    print(
                        f"\r[T+{int(elapsed):03d}s] "
                        f"RPS: {curr_rps:4.1f} | "
                        f"Total: {stats['total']:5d} | "
                        f"2xx: {stats['2xx']:5d} | "
                        f"4xx: {stats['4xx']:2d} | "
                        f"5xx: {stats['5xx']} | "
                        f"Missing: {stats['missing']} | "
                        f"p50: {stats['p50']:3.0f}ms | "
                        f"p99: {stats['p99']:3.0f}ms",
                        end="",
                        flush=True,
                    )

        except KeyboardInterrupt:
            print("\nStopping traffic generator gracefully...")

    stats = metrics.get_stats()
    total_elapsed = time.time() - start_time
    overall_rps = stats["total"] / total_elapsed if total_elapsed > 0 else 0

    print("\n" + "=" * 75)
    print("LIVE DEMONSTRATION TRAFFIC SUMMARY REPORT")
    print("=" * 75)
    print(f"Total Duration        : {total_elapsed:.2f} seconds")
    print(f"Total Requests Sent   : {stats['total']}")
    print(f"Average Throughput    : {overall_rps:.1f} requests/second (Target: >= 20)")
    print(f"Success (HTTP 2xx)    : {stats['2xx']}")
    print(f"Client Errors (4xx)   : {stats['4xx']}")
    print(f"Server Errors (5xx)   : {stats['5xx']} {'[PASS]' if stats['5xx'] == 0 else '[FAIL]'}")
    print(f"Missing/Corrupt Fields: {stats['missing']} {'[PASS]' if stats['missing'] == 0 else '[FAIL]'}")
    print(f"Latency P50           : {stats['p50']:.1f} ms")
    print(f"Latency P95           : {stats['p95']:.1f} ms")
    print(f"Latency P99           : {stats['p99']:.1f} ms {'[PASS]' if stats['p99'] < 500 else '[FAIL]'}")
    print("=" * 75)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Zero-Downtime Concurrent Traffic Generator")
    parser.add_argument("--url", default="http://localhost:8000", help="Web API Base URL")
    parser.add_argument("--rps", type=float, default=25.0, help="Target Requests Per Second (>= 20)")
    parser.add_argument("--duration", type=int, default=None, help="Duration in seconds (None for continuous)")
    parser.add_argument("--workers", type=int, default=8, help="Number of concurrent worker threads")
    args = parser.parse_args()

    run_traffic(base_url=args.url, target_rps=args.rps, duration_sec=args.duration, workers=args.workers)
