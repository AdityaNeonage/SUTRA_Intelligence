# Case Study: Detecting a Money-Mule Fraud Ring via Transaction Network Graphs

## Scenario
A retail bank has 150 customer accounts. Investigators suspect a portion of accounts
are being used to launder stolen funds through a **smurfing** scheme: money entering
through a few compromised "source" accounts is rapidly split across many
low-profile "mule" accounts, then consolidated into a small number of
"collector" accounts before cash-out. A secondary pattern of **circular
transaction loops** (wash trading / layering) is also present to obscure the
money trail.

## Files
- `accounts.csv` — 150 accounts with `account_id`, `role` (ground-truth label,
  for evaluation only — a real detector wouldn't see this), `opened_date`, `country`
- `transactions.csv` — 582 transactions with `src_account`, `dst_account`,
  `amount`, `timestamp`, and `is_fraud` (ground-truth label)

## Ground-truth structure (for evaluating your detector)
| Role | Count | Behavior |
|---|---|---|
| normal | 120 | Random sparse P2P activity, low value |
| fraud_source | 5 | Injects large sums, splits into 4–6 mule payments |
| fraud_mule | 20 | Receives split funds, forwards almost all of it within 1–2 days to a collector |
| fraud_collector | 5 | Receives converging inflows from multiple mules |

Two 3-node circular loops (A→B→C→A) among mule accounts simulate wash trading.

## Suggested detection approach (graph-based)
1. **Build the graph**: directed multigraph, nodes = accounts, edges = transactions (weighted by amount, timestamped).
2. **Structural features per node**:
   - In-degree / out-degree ratio (mules: high out-degree relative to in-degree, fast pass-through)
   - Fan-in / fan-out ratio (collectors: high fan-in; sources: high fan-out)
   - Time delta between inbound and outbound transactions (mules forward quickly — flag <48h)
   - Amount-in vs. amount-out similarity per node (mules pass through ~90-98% of received funds)
3. **Cycle detection**: run a cycle-finding algorithm (e.g. Johnson's algorithm) to catch the circular layering loops.
4. **Community/clustering**: run Louvain or label propagation to find the source→mule→collector subgraph as a distinct dense community separate from the sparse normal graph.
5. **Score and rank**: combine structural anomaly scores (e.g. via a weighted sum or an Isolation Forest on the engineered features) to rank accounts by fraud likelihood.
6. **Evaluate**: compare your flagged accounts/transactions against the `role`/`is_fraud` ground-truth columns (precision/recall, since this is a labeled synthetic set).

## Suggested tools
- **NetworkX** (Python) for quick prototyping of degree stats, cycle detection, community detection
- **Neo4j + Cypher / Graph Data Science library** if you want a proper graph database and built-in fraud-detection algorithms (e.g. `gds.triangleCount`, `gds.louvain`, `gds.pageRank`)
- **Gephi** for visual inspection of the network (color nodes by detected community vs. ground-truth role to sanity check)

## A note on realism
This is a **synthetic, simplified** dataset meant for testing detection logic — real fraud rings are noisier (mules also do legitimate transactions, amounts aren't clean splits, timing is more randomized). Once your pipeline works here, consider adding noise (mules with some normal-looking transactions mixed in) to stress-test it further. I'm happy to generate a "hard mode" version with that added noise if useful.
