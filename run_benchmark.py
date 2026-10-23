"""CP3 Automated Load Testing & Benchmark Runner.

Executes the official CP3 Load Profile with 0 external dependencies:
- Minimum 50 Virtual Users (VUs) executing concurrent read/write transactions.
- Benchmark Duration: 3 minutes (configurable via --duration).
- Target Performance SLA Metrics:
  * Throughput: Stable Requests Per Second (RPS).
  * Latency: p95 < 200ms, p99 < 500ms.
  * Error Rate: HTTP error rate below 1%.
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

CATEGORIES = ["cpu", "gpu", "ram", "motherboard", "monitor", "laptop"]


class BenchmarkMetrics:
    def __init__(self):
        self.lock = Lock()
        self.total_requests = 0
        self.success_count = 0
        self.client_errors = 0
        self.server_errors = 0
        self.latencies = deque(maxlen=20000)

    def record(self, status: int, latency_ms: float):
        with self.lock:
            self.total_requests += 1
            if 200 <= status < 300:
                self.success_count += 1
            elif 400 <= status < 500:
                self.client_errors += 1
            else:
                self.server_errors += 1
            self.latencies.append(latency_ms)

    def summary(self):
        with self.lock:
            lats = sorted(self.latencies) if self.latencies else [0.0]
            n = len(lats)
            p50 = lats[int(n * 0.50)] if n > 0 else 0.0
            p90 = lats[int(n * 0.90)] if n > 0 else 0.0
            p95 = lats[int(n * 0.95)] if n > 0 else 0.0
            p99 = lats[int(n * 0.99)] if n > 0 else 0.0
            avg = sum(lats) / n if n > 0 else 0.0
            error_rate = (self.server_errors / self.total_requests * 100.0) if self.total_requests else 0.0
            return {
                "total": self.total_requests,
                "success": self.success_count,
                "client_errors": self.client_errors,
                "server_errors": self.server_errors,
                "error_rate": error_rate,
                "p50": p50,
                "p90": p90,
                "p95": p95,
                "p99": p99,
                "avg": avg,
            }


def http_request(url: str, method: str = "GET", data: dict | None = None, timeout: float = 3.0) -> int:
    encoded = json.dumps(data).encode("utf-8") if data else None
    headers = {"Content-Type": "application/json"} if data else {}
    req = urllib.request.Request(url, data=encoded, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 500


def simulate_vu_worker(base_url: str, metrics: BenchmarkMetrics, stop_time: float):
    """Simulate a single Virtual User (VU) continuous session."""
    while time.time() < stop_time:
        t0 = time.time()
        action = random.random()

        if action < 0.50:
            # 1. Read: Paginated catalog query with CP3 Query Projection
            page = random.randint(1, 5)
            status = http_request(f"{base_url}/api/v1/products?page={page}&page_size=12")
        elif action < 0.75:
            # 2. Read: Category filter
            cat = random.choice(CATEGORIES)
            status = http_request(f"{base_url}/api/v1/products?category={cat}&page_size=10")
        elif action < 0.90:
            # 3. Write: User Registration
            payload = {
                "email": f"bench_{uuid4().hex[:10]}@example.com",
                "first_name": "BenchUser",
                "last_name": "VU",
                "password": "Password123!",
            }
            status = http_request(f"{base_url}/api/v1/users", method="POST", data=payload)
        else:
            # 4. Read: Categories metadata
            status = http_request(f"{base_url}/api/v1/categories")

        latency_ms = (time.time() - t0) * 1000.0
        metrics.record(status, latency_ms)
        time.sleep(random.uniform(0.01, 0.05))


def run_benchmark(base_url: str, vus: int = 50, duration_sec: int = 180):
    print("=" * 75)
    print("CP3 AUTOMATED LOAD & PERFORMANCE BENCHMARK")
    print(f"Target API     : {base_url}")
    print(f"Load Profile   : {vus} Concurrent Virtual Users (VUs)")
    print(f"Duration       : {duration_sec} seconds ({duration_sec // 60}m {duration_sec % 60}s)")
    print("SLA Target     : p95 < 200ms | p99 < 500ms | HTTP Error Rate < 1%")
    print("=" * 75)

    metrics = BenchmarkMetrics()
    start_time = time.time()
    stop_time = start_time + duration_sec

    # Warm-up check
    health_status = http_request(f"{base_url}/api/v1/health")
    if health_status != 200:
        print(f"[Warning] Health check returned HTTP {health_status}. Ensure API server is running.")

    print(f"\n[Running] Spawning {vus} parallel VU worker threads...")
    last_print = start_time
    prev_total = 0

    with ThreadPoolExecutor(max_workers=vus) as executor:
        futures = [executor.submit(simulate_vu_worker, base_url, metrics, stop_time) for _ in range(vus)]

        try:
            while time.time() < stop_time:
                time.sleep(1.0)
                now = time.time()
                elapsed = now - start_time
                s = metrics.summary()
                curr_rps = (s["total"] - prev_total) / (now - last_print) if (now - last_print) > 0 else 0.0
                prev_total = s["total"]
                last_print = now

                rem = max(0, int(stop_time - now))
                print(
                    f"\r[T+{int(elapsed):03d}s | Rem: {rem:03d}s] "
                    f"RPS: {curr_rps:5.1f} | "
                    f"Reqs: {s['total']:6d} | "
                    f"p50: {s['p50']:3.0f}ms | "
                    f"p95: {s['p95']:3.0f}ms | "
                    f"p99: {s['p99']:3.0f}ms | "
                    f"Errors: {s['server_errors']}",
                    end="",
                    flush=True,
                )
        except KeyboardInterrupt:
            print("\nBenchmark interrupted by user. Finalizing summary...")

    # Wait for all threads to terminate
    for f in futures:
        f.result()

    total_elapsed = time.time() - start_time
    stats = metrics.summary()
    overall_rps = stats["total"] / total_elapsed if total_elapsed > 0 else 0.0

    print("\n\n" + "=" * 75)
    print("CP3 PERFORMANCE BENCHMARK AUDIT REPORT")
    print("=" * 75)
    print(f"Total Duration               : {total_elapsed:.2f} seconds")
    print(f"Concurrent Virtual Users     : {vus} VUs")
    print(f"Total Requests Executed      : {stats['total']}")
    print(f"Average System Throughput    : {overall_rps:.1f} Requests/Second (RPS)")
    print(f"Successful Requests (2xx)    : {stats['success']}")
    print(f"Client Requests (4xx)        : {stats['client_errors']}")
    print(f"Server Errors (5xx)          : {stats['server_errors']}")
    print(f"HTTP Error Rate              : {stats['error_rate']:.2f}% {'[PASS < 1%]' if stats['error_rate'] < 1.0 else '[FAIL]'}")
    print("-" * 75)
    print("LATENCY DISTRIBUTION (SLA BENCHMARK):")
    print(f" - Average Latency           : {stats['avg']:.1f} ms")
    print(f" - Median (p50) Latency      : {stats['p50']:.1f} ms")
    print(f" - 90th Percentile (p90)     : {stats['p90']:.1f} ms")
    print(f" - 95th Percentile (p95)     : {stats['p95']:.1f} ms {'[PASS < 200ms]' if stats['p95'] < 200 else '[FAIL]'}")
    print(f" - 99th Percentile (p99)     : {stats['p99']:.1f} ms {'[PASS < 500ms]' if stats['p99'] < 500 else '[FAIL]'}")
    print("=" * 75)

    all_passed = (stats["error_rate"] < 1.0) and (stats["p95"] < 200.0) and (stats["p99"] < 500.0)
    print(f"OVERALL CP3 BENCHMARK STATUS : {'PASSED (READY FOR DEFENSE)' if all_passed else 'NEEDS TUNING'}")
    print("=" * 75)
    return all_passed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CP3 Automated Load Testing & Benchmark")
    parser.add_argument("--url", default="http://localhost:8000", help="Web API Base URL")
    parser.add_argument("--vus", type=int, default=50, help="Number of Concurrent Virtual Users (Minimum 50)")
    parser.add_argument("--duration", type=int, default=180, help="Duration in seconds (Default 180s / 3m)")
    args = parser.parse_args()

    run_benchmark(base_url=args.url, vus=args.vus, duration_sec=args.duration)
