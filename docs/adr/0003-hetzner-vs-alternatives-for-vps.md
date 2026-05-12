# ADR-0003: Hetzner CX22 vs Other VPS Providers for Self-Hosted Infrastructure

- **Date**: 2026-05-08
- **Status**: accepted
- **Deciders**: anto (owner), opencode (architect)

## Context

HospedaSuite needs to migrate from Vercel (web) + managed Supabase (DB + auth + storage) to a self-hosted infrastructure on a VPS. The migration must happen BEFORE real users exist. The setup needs to run:

- Coolify (PaaS orchestrator) for deployment management
- Self-hosted Supabase stack (PostgreSQL 16, Gotrue, PostgREST, Storage)
- Next.js application (build + serve)
- Monitoring (optional, for future)

Requirements: 2-4 GB RAM, 2+ vCPUs, 40+ GB storage (SSD), good network connectivity to Latin America (the target market is Colombia/Spain), and costs under ~€10/mes during early stages.

## Options Considered

| Option | Specs | Price | Pros | Cons |
|--------|-------|-------|------|------|
| **Hetzner CX22** | 2 vCPU, 4 GB RAM, 40 GB SSD, 20 TB traffic | €4.49/mes | Cheapest by far; excellent network (DE/FI); great reputation; hourly billing; API-first | No LATAM-optimized region; support is ticket-only (no chat); no managed DB |
| **DigitalOcean Basic** | 2 vCPU, 4 GB RAM, 80 GB SSD, 4 TB traffic | $24/mes (~€22) | Excellent docs; one-click apps; LATAM-friendly support; droplet snapshots | 5x more expensive than Hetzner; traffic cap lower; same specs for 5x price |
| **Linode (Akamai) Shared** | 2 vCPU, 4 GB RAM, 80 GB SSD, 4 TB traffic | $24/mes (~€22) | Great control panel; good network; acquired by Akamai → enterprise stability | Same price as DO; fewer one-click integrations |
| **Vultr Cloud Compute** | 1 vCPU, 2 GB RAM, 55 GB SSD, 2 TB traffic | $12/mes (~€11) | More regions than Hetzner (including LATAM?); competitive mid-range | 2.5x more expensive for less RAM; smaller traffic cap; 1 vCPU at base tier |
| **OVHcloud** | 2 vCPU, 4 GB RAM, 80 GB SSD | ~€7/mes | French provider; good for EU data sovereignty; cheaper than DO/Linode | Less dev-friendly tooling; smaller community for self-hosting guides |
| **AWS EC2 (t4g.medium)** | 2 vCPU, 4 GB RAM, EBS only | ~€25/mes + storage | Enterprise-grade; infinite scalability; global regions | Overkill for this stage; complex billing; much more expensive |

## Decision

We chose **Hetzner CX22** (€4.49/mes, 2 vCPU, 4 GB RAM, 40 GB SSD).

## Consequences

- **Positive**: Costs are ~€4.50/mes — 5x cheaper than DigitalOcean/Linode for the same specs. This keeps the project viable during the zero-revenue stage.
- **Positive**: 20 TB traffic is generous — no bandwidth worries during early growth.
- **Positive**: Hourly billing means we can experiment with no long-term commitment.
- **Negative**: No LATAM-optimized region. Users in Colombia may experience higher latency (~150-200ms from DE). Acceptable for a hotel management tool (not real-time), but we should re-evaluate if latency becomes a problem.
- **Negative**: Support is ticket-only. No chat or phone. Acceptable since we self-manage everything through Coolify's UI + SSH.
- **Negative**: Smaller VPS community for self-hosting guides compared to DO. Most guides target DO; we'll need to adapt.

## Migration Plan

5-phase plan (~16 hours total):
1. **Provisioning** (2h): Create Hetzner account, provision CX22, set up Firewall, DNS (hospedasuite.com), SSH key
2. **Coolify + Docker** (2h): Install Coolify, configure Docker, deploy Coolify proxy via Caddy
3. **Self-hosted Supabase** (6h): Deploy Supabase stack via Coolify/Docker Compose (PostgreSQL 16, Gotrue, PostgREST, Storage, Kong), configure SSL via Caddy, create API keys
4. **Deploy App** (4h): Connect Coolify to GitHub repo, configure build, set environment variables, migrate DB schema (from managed Supabase), verify RPCs
5. **Cutover + Monitoring** (2h): Point DNS, verify SSL, smoke test all flows, decommission Vercel + managed Supabase, set up Uptime Kuma

## Y-Statement

> In the context of migrating from Vercel+managed Supabase before real users exist, facing a zero-revenue stage with 62 TS errors already resolved, we decided for Hetzner CX22 over DigitalOcean/Linode to achieve 5x cost savings at identical specs, accepting higher LATAM latency and ticket-only support.

## Links

- Related: ADR-0001 (self-hosted Supabase auth)
- Related: `documentación/radiografia-modelo-negocio.md`
- Hetzner CX22: https://www.hetzner.com/cloud
