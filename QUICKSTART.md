# Quick Start Guide

Get Markver running in 5 minutes!

## 1. Start Services

```bash
# Start PostgreSQL and Redis
npm run docker:up
```

Wait ~10 seconds for services to be ready.

## 2. Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

When prompted, enter migration name: `init`

## 3. Start Server

```bash
# Start development server
npm run dev
```

You should see:
```
[INFO] [Redis] Redis connected successfully
[INFO] [PrismaClient] Database connected successfully
[INFO] [OrderWorker] Order worker started
[INFO] [Server] Server started on port 3000
```

## 4. Test It!

### Option A: Web UI (Easiest)

Open `test-client.html` in your browser and click "Create 5 Orders (Demo)"

### Option B: cURL

```bash
# Test health endpoint
curl http://localhost:3000/api/health
```

### Option C: WebSocket Test

```bash
# Install wscat
npm install -g wscat

# Connect and send order
wscat -c ws://localhost:3000/api/orders/execute
```

Then paste this JSON:
```json
{
  "orderType": "market",
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 10
}
```

You'll see live status updates!

## 5. Run Tests

```bash
npm test
```

All tests should pass! ✅

---

## Next Steps

- 📖 Read [README.md](./README.md) for full documentation
- 🚀 Read [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions
- 📮 Import `postman_collection.json` into Postman
- 🎥 Record demo video showing 5 concurrent orders

---

## Troubleshooting

**Docker services not starting?**
```bash
docker-compose down -v
docker-compose up -d
```

**Port 3000 already in use?**
- Change PORT in `.env` file
- Or kill existing process: `lsof -ti:3000 | xargs kill`

**Prisma migration fails?**
```bash
# Reset database
npx prisma migrate reset
npm run prisma:migrate
```

**Tests failing?**
- Ensure Docker services are running
- Check database connection: `npm run prisma:studio`
- Verify Redis: `redis-cli ping`

---

## Project Structure Overview

```
src/
├── api/              # Fastify routes & schemas
├── services/
│   ├── dex/          # Raydium & Meteora mock services
│   ├── execution/    # Order execution logic
│   ├── queue/        # BullMQ queue setup
│   └── websocket/    # WebSocket status updates
├── workers/          # Queue workers
└── db/               # Prisma & Redis clients
```

---

## Environment Variables

Key settings in `.env`:

- `MOCK_MODE=true` - Use mock DEX (set to false for real devnet)
- `MAX_CONCURRENT_ORDERS=10` - Concurrent order limit
- `ORDERS_PER_MINUTE=100` - Rate limit
- `DEX_EXECUTION_DELAY_MS=2000` - Mock execution time

---

## Demo Script for Video

1. **Show health check**: `curl http://localhost:3000/api/health`
2. **Open test client**: Open `test-client.html`
3. **Submit 5 orders**: Click "Create 5 Orders (Demo)"
4. **Show console**: Display terminal with logs showing:
   - DEX routing decisions (Raydium vs Meteora prices)
   - Order status transitions
   - Transaction hashes
5. **Show results**: Point out completed orders in UI
6. **Check database**: `npm run prisma:studio` to show stored orders

Record as you narrate the flow! 🎬

---

## Production Checklist

Before deploying:

- [ ] Update README with your GitHub repo URL
- [ ] Update README with deployed API URL
- [ ] Update README with demo video link
- [ ] Test Postman collection with deployed URL
- [ ] Record and upload demo video
- [ ] Commit all changes
- [ ] Push to GitHub
- [ ] Deploy to Railway/Render
- [ ] Verify health endpoint works
- [ ] Test order submission on production

---

Good luck! 🚀
