[![Moleculer](https://badgen.net/badge/Powered%20by/Moleculer/0e83cd)](https://moleculer.services)

# Enterprise Service Bus

A company-wide integration backbone that keeps dozens of business systems in sync
in real time. ERP, CRM, e-commerce, marketing, logistics, and analytics platforms
don't talk to each other directly — they publish and consume events on this bus,
which transforms, routes, and reconciles data between them.

Built as an **event-driven microservices** platform on
[Moleculer](https://moleculer.services/) and **Apache Kafka**, it runs on
**Kubernetes** with GitLab CI/CD and full observability. It's the kind of
mission-critical, always-on system where a single dropped order or a stale
inventory count is a real business problem — so reliability, idempotency, and
traceability are first-class concerns, not afterthoughts.

## What it does

The bus is the single integration point between systems that were never designed
to work together. A change in one platform (a new order, an updated client, a
fresh inventory level) becomes a Kafka event that the relevant services pick up,
transform into each target system's format, and deliver — with retries, dedup,
and end-to-end logging.

Integrated domains (40+ services) include:

- **ERP / 1C** — orders, realizations, clients, inventory, BOM, cross-company (DZO) flows
- **CRM** — clients, contacts, leads, jobs, agreements
- **E-commerce** — Magento order intake, transformation, and fulfilment
- **Marketing** — Mindbox and Sendsay customer-engagement sync
- **Logistics** — TMS and 3PL warehouse integration
- **Catalog** — PIM / item master-data propagation
- **Regional** — cross-border (KZ) client and order flows
- **Analytics** — education performance/statistics data pipeline
- **Ops** — Telegram notifications, OpenAPI gateway, supervisor and puller services

## Architecture

```
   External systems (ERP/1C · CRM · Magento · Mindbox · TMS · 3PL · PIM · …)
                    │                                   ▲
             pull / webhook                       transform + push
                    ▼                                   │
        ┌───────────────────────────────────────────────────────┐
        │                Moleculer microservices                 │
        │  generators · transformers · request services · gateway│
        └───────────────┬───────────────────────┬───────────────┘
                        │  events               │  service calls / cache
                   ┌────▼─────┐            ┌─────▼─────┐
                   │  Kafka   │            │   Redis   │
                   │ (@channels)│          │ transport + cache │
                   └──────────┘            └───────────┘
                        │
        stores: MongoDB · MSSQL          logs: OpenSearch (pino)
```

- **Event backbone** — Apache Kafka via `@moleculer/channels` and `kafkajs`;
  durable consumers, replayable topics, at-least-once delivery.
- **Service mesh** — Moleculer services communicate over a Redis transporter with
  a Redis cacher; each integration is an independent, individually deployable service.
- **Pattern** — most integrations follow a *generator → transformer → request*
  pipeline: pull/receive source data, transform to the target schema, deliver with
  retries and idempotency.
- **Data stores** — MongoDB and MSSQL for state and staging.
- **API surface** — `moleculer-web` gateway with auto-generated OpenAPI docs.
- **Scheduling** — cron-driven pullers (`moleculer-cron`) for polling upstreams.

## Reliability & observability

- **Kubernetes** deployment via Helm values per environment (dev / test / prod),
  horizontally scaled replicas per service.
- **GitLab CI/CD** — merge to `test` auto-deploys to staging, merge to `master`
  auto-deploys to production; Jira-keyed feature branches.
- **Metrics** — custom Prometheus middleware records per-action latency (gauge)
  and message throughput (counter), surfaced in Grafana.
- **Centralized logging** — structured `pino` logs shipped to OpenSearch for
  cross-service tracing and error triage.
- **Scenario tests** — the `scenario/` suite replays realistic data through a
  chosen service chain end-to-end (e.g. order generated in ERP → delivered to CRM).

## Tech stack

Node.js · Moleculer · Apache Kafka (`@moleculer/channels`, `kafkajs`) · Redis ·
MongoDB · MSSQL · OpenSearch · Prometheus · Grafana · Kubernetes · Helm ·
GitLab CI/CD · Docker

## Running locally

Services run under the Moleculer runner against dev Kafka/Redis clusters
(configured via a local `.env`):

```bash
npm install
npm run start                      # all services
# or a single service / chain:
moleculer-runner --repl -E .env services/api.service.js
```

Ready-made end-to-end scenarios are wired up as npm scripts, e.g.:

```bash
npm run scenario:incoming-orders   # puller + generator + CRM + scenario driver
```

> Note: with Kafka consumers set to `fromBeginning: true`, start the service
> chain **before** the scenario driver so test data is consumed correctly.
