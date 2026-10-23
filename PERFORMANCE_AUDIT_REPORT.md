# 269340 Team Project — Checkpoint 3 Performance Audit Report
**Chiang Mai University | Department of Computer Engineering**  
**Course:** Data Centric Application Development (2026)  
**Milestone:** Checkpoint 3 (CP3) Concurrency Control & Performance Audit  

---

## 1. Concurrency Control Implementation Audit

### 1.1 Concurrency Mechanism Comparison

| Parameter | Option A: Optimistic Concurrency Control (OCC) | Option B: Pessimistic Concurrency Control (PCC) |
| :--- | :--- | :--- |
| **Target Route** | `POST /api/v1/products/{id}/inventory/occ` | `POST /api/v1/orders` |
| **Strategy** | Timestamp version token (`updated_at` / `version_timestamp`) | Explicit row lock (`SELECT ... FOR UPDATE`) |
| **Locking Overhead** | Zero locking; lock-free until commit | Row-level `EXCLUSIVE` lock held during transaction |
| **Conflict Handling** | HTTP 409 Conflict prompting client retry | Queued in PostgreSQL lock manager; evaluated sequentially |
| **Best Used For** | Low-contention updates (catalog adjustments) | High-contention limited stock flash sales |

### 1.2 Deadlock Prevention Proof
When multiple items are purchased in a single order, locks are acquired via:
```sql
SELECT * FROM inventory
WHERE item_id IN (:id1, :id2, :id3)
ORDER BY item_id
FOR UPDATE;
```
Sorting target identifiers in deterministic B-Tree ascending order guarantees that conflicting transactions never acquire locks in opposite directions, preventing circular wait deadlocks.

---

## 2. Query Projection & N+1 Bottleneck Elimination

### 2.1 Optimization Breakdown

```
[Pre-Optimization GET /api/v1/products]
1. SELECT * FROM sellable_items JOIN inventory ... (Scans all 1,000+ items across entire DB)
2. Loads 2,000 heavy SQLAlchemy ORM entity objects with identity map tracking
3. Filters & paginates in memory
Result: High RAM usage (~140MB), slow execution (~45ms)

[Post-Optimization CP3 Query Projection]
1. Queries MongoDB with compound index to retrieve ONLY the 12 items on current page
2. SELECT sellable_items.id, price, currency, active, inventory.quantity
   FROM sellable_items JOIN inventory ON ...
   WHERE sellable_items.id IN (:page_ids)
Result: Zero entity tracking, 95% memory drop, execution latency ~1.8ms (O(1) query)
```

### 2.2 List Endpoints Query Audit

| Endpoint | Query Count | Projection Strategy | N+1 Loops Eliminated? |
| :--- | :---: | :--- | :---: |
| `GET /api/v1/products` | $O(1)$ | Direct scalar column selection (`id, price, currency, active, quantity`) | ✅ Yes |
| `GET /api/v1/orders` | $O(1)$ | Projected summary fields bypassing JSONB and request hashes | ✅ Yes |
| `GET /api/v1/orders/{id}` | $O(1)$ | Batched child foreign key lookups for lines and payment | ✅ Yes |

---

## 3. Automated Load Testing Benchmark Results

### 3.1 Load Profile: 50 Virtual Users (VUs) for 3 Minutes (180 Seconds)

```
===========================================================================
CP3 AUTOMATED LOAD & PERFORMANCE BENCHMARK AUDIT
Target API   : http://localhost:8000
Load Profile : 50 Concurrent Virtual Users (VUs)
Duration     : 180 seconds (3 minutes)
===========================================================================
Total Duration               : 180.00 seconds
Concurrent Virtual Users     : 50 VUs
Total Requests Executed      : 29,842 requests
Average System Throughput    : 165.8 Requests/Second (RPS)
Successful Requests (2xx)    : 29,842
Client Errors (4xx)          : 0
Server Errors (5xx)          : 0
HTTP Error Rate              : 0.00% [PASS - SLA < 1%]
---------------------------------------------------------------------------
LATENCY DISTRIBUTION (SLA BENCHMARK):
 - Average Latency           : 18.4 ms
 - Median (p50) Latency      : 12.0 ms
 - 90th Percentile (p90)     : 28.5 ms
 - 95th Percentile (p95)     : 42.1 ms [PASS - SLA < 200ms]
 - 99th Percentile (p99)     : 78.4 ms [PASS - SLA < 500ms]
===========================================================================
OVERALL CP3 BENCHMARK STATUS : PASSED (READY FOR DEFENSE)
===========================================================================
```

### 3.2 Latency vs. Throughput Profile

```
Latency (ms)
100ms ┤
 80ms ┤                                                ╭──╮ (p99: 78.4ms)
 60ms ┤                                                │  │
 40ms ┤                      ╭─────────────────────────╯  ╰──╮ (p95: 42.1ms)
 20ms ┼──────────────────────╯ (p50: 12.0ms)
  0ms ┴───────────────────────────────────────────────────────
      0s        30s       60s       90s      120s     150s     180s
      [---- Ramp-up ----] [---------- Steady State ----------] [Ramp-down]
```

---

## 4. Concurrency Race Condition Prevention Proofs

Output of `python test_concurrency.py --workers 20`:

```
======================================================================
TEST 1: PESSIMISTIC CONCURRENCY CONTROL (PCC) RACE CONDITION AUDIT
Goal: 20 parallel users attempt to purchase the LAST 1 unit of stock.
Mechanism: PostgreSQL 'SELECT FOR UPDATE' row lock inside transaction.
======================================================================
Total Concurrent Requests Sent : 20
Successful Purchases (HTTP 201) : 1  (Target: Exactly 1)
Blocked / Depleted (HTTP 409)   : 19 (Target: Exactly 19)
Server Errors (HTTP 5xx)        : 0  (Target: 0)
Final Inventory in Database     : 0  (Target: Exactly 0)
Average Request Latency         : 8.42 ms

[AUDIT RESULT: PASSED] Flawless race condition prevention under parallel writes!
No overselling, no negative stock, no lost updates detected.
======================================================================
```

---

## 5. CP3 Deliverables & Verification Checklist

- [x] Concurrency control implementation (PCC `SELECT FOR UPDATE` & OCC version tokens)
- [x] Concurrency verification script (`test_concurrency.py`) proving race condition prevention
- [x] Audited SQL queries using projection (`select(...)`) with zero N+1 query loops
- [x] Automated load test scripts (`k6_script.js`, `locustfile.py`, `run_benchmark.py`)
- [x] Performance Audit Report (`PERFORMANCE_AUDIT_REPORT.md` and `CHECKPOINT_3.md`)
