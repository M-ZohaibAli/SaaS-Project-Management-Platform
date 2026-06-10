# Deployment Guide

## Local Docker

1. Copy `.env.example` to `.env` and replace secrets.
2. Run `docker compose up --build`.
3. Open `http://localhost:4173`.
4. PostgreSQL is available on port `5432`; Redis is available on port `6379`.

## Database

1. Set `DATABASE_URL` to a PostgreSQL database.
2. Run `npx prisma migrate deploy` in the API deployment.
3. Seed demo data with `npx prisma db seed` when needed.
4. Enable automated backups and point-in-time recovery.

## Vercel

1. Add environment variables from `.env.example`.
2. Configure a managed PostgreSQL provider and Redis provider.
3. Build command: `npm run build`.
4. Output directory: `dist` for this Vite frontend, or `.next` if moved to Next.js App Router.
5. Run Prisma migrations from CI or a one-off deployment job.

## Railway

1. Create PostgreSQL and Redis services.
2. Deploy from GitHub using the Dockerfile.
3. Set `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, storage keys, and AI provider keys.
4. Add a pre-deploy migration command: `npx prisma migrate deploy`.

## AWS

1. Build the Docker image and push to ECR.
2. Run the app on ECS Fargate or App Runner.
3. Use RDS PostgreSQL with deletion protection and backups.
4. Use ElastiCache Redis for cache, rate limits, and Socket.io adapter.
5. Store files in S3 with private buckets, KMS encryption, and presigned upload URLs.
6. Put CloudFront and AWS WAF in front of the app.
7. Store secrets in AWS Secrets Manager or SSM Parameter Store.

## Production Checklist

- Replace all example secrets.
- Enable HTTPS and HSTS.
- Run `npm audit --audit-level=high` in CI.
- Run migrations before app rollout.
- Configure error monitoring and structured logs.
- Set up database backups and restore drills.
- Configure rate limits and WAF rules.
- Verify tenant isolation tests before each release.