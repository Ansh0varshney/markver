# Deployment Guide

## Local Development

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm

### Setup Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start Docker services**
   ```bash
   npm run docker:up
   ```

3. **Generate Prisma client and run migrations**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Run tests**
   ```bash
   npm test
   ```

6. **Open test client**
   - Open `test-client.html` in your browser
   - Or navigate to `http://localhost:3000/api/health`

---

## Railway Deployment

### Quick Deploy

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**
   ```bash
   railway login
   ```

3. **Initialize project**
   ```bash
   railway init
   ```

4. **Add PostgreSQL**
   ```bash
   railway add -d postgres
   ```

5. **Add Redis**
   ```bash
   railway add -d redis
   ```

6. **Set environment variables**
   ```bash
   railway variables set MOCK_MODE=true
   railway variables set MAX_CONCURRENT_ORDERS=10
   railway variables set ORDERS_PER_MINUTE=100
   ```

7. **Deploy**
   ```bash
   railway up
   ```

8. **Get your URL**
   ```bash
   railway domain
   ```

### Environment Variables for Railway

Set these in the Railway dashboard:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=<automatically set by Railway>
REDIS_HOST=<automatically set by Railway>
REDIS_PORT=<automatically set by Railway>
MOCK_MODE=true
MAX_CONCURRENT_ORDERS=10
ORDERS_PER_MINUTE=100
MAX_RETRIES=3
DEX_NETWORK_DELAY_MS=200
DEX_EXECUTION_DELAY_MS=2000
DEFAULT_SLIPPAGE_TOLERANCE=0.01
```

---

## Render Deployment

### Quick Deploy

1. **Connect GitHub repo to Render**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure the service**
   - **Name**: markver-api
   - **Environment**: Node
   - **Region**: Oregon (US West)
   - **Branch**: main
   - **Build Command**: `npm install && npm run build && npx prisma generate`
   - **Start Command**: `npx prisma migrate deploy && npm start`

3. **Add PostgreSQL**
   - Click "New +" → "PostgreSQL"
   - Name: markver-db
   - Plan: Free

4. **Add Redis**
   - Click "New +" → "Redis"
   - Name: markver-redis
   - Plan: Free

5. **Set environment variables**
   In the Render dashboard, add:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=<from PostgreSQL service>
   REDIS_HOST=<from Redis service>
   REDIS_PORT=<from Redis service>
   MOCK_MODE=true
   MAX_CONCURRENT_ORDERS=10
   ORDERS_PER_MINUTE=100
   ```

6. **Deploy**
   - Render will automatically deploy on git push

---

## Verifying Deployment

### Health Check
```bash
curl https://your-app-url.com/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### Test Order Submission

Use the Postman collection or test with WebSocket client:

```javascript
const ws = new WebSocket('wss://your-app-url.com/api/orders/execute');

ws.onopen = () => {
  ws.send(JSON.stringify({
    orderType: 'market',
    tokenIn: 'SOL',
    tokenOut: 'USDC',
    amountIn: 10
  }));
};

ws.onmessage = (event) => {
  console.log('Status update:', JSON.parse(event.data));
};
```

---

## Monitoring

### Logs

**Railway:**
```bash
railway logs
```

**Render:**
- View logs in the Render dashboard under "Logs" tab

### Database

**Prisma Studio (local):**
```bash
npm run prisma:studio
```

### Queue Monitoring

**BullBoard** (optional, can be added):
- Install `@bull-board/api` and `@bull-board/fastify`
- Mount at `/admin/queues`

---

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check PostgreSQL service is running
- Ensure migrations ran: `npx prisma migrate deploy`

### Redis Connection Issues
- Verify REDIS_HOST and REDIS_PORT
- Check Redis service is running
- Test connection: `redis-cli -h HOST -p PORT ping`

### Worker Not Processing Orders
- Check logs for worker startup message
- Verify Redis connection
- Ensure queue is not paused

### WebSocket Connection Fails
- Check CORS settings
- Verify WebSocket upgrade is allowed
- Test with test-client.html locally first

---

## Production Checklist

- [ ] Environment variables set correctly
- [ ] Database migrations applied
- [ ] Redis connected
- [ ] Health check returns 200
- [ ] Test order completes successfully
- [ ] Logs show no errors
- [ ] WebSocket connections work
- [ ] Queue processing orders
- [ ] Postman collection works with deployed URL

---

## Scaling Considerations

### Horizontal Scaling
- Multiple API instances can share same Redis + PostgreSQL
- Each instance runs its own worker
- BullMQ handles distributed job processing

### Performance Tuning
- Adjust `MAX_CONCURRENT_ORDERS` based on load
- Monitor `ORDERS_PER_MINUTE` rate limit
- Optimize `DEX_EXECUTION_DELAY_MS` in mock mode

### Database Optimization
- Add indexes for frequently queried fields
- Archive old orders periodically
- Use connection pooling

---

## Support

For issues:
1. Check logs first
2. Verify environment variables
3. Test locally with Docker
4. Check health endpoint
5. Review test results
