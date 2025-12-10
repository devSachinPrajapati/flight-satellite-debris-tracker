# Flight & Satellite Tracker Backend Research

Real-time tracking system backend for aircraft, satellites, and space debris.

## Features

- ✈️ Real-time aircraft tracking (AirLabs API)
- 🛰️ Satellite & debris tracking (CelesTrak TLE + SGP4)
- 📊 REST API endpoints
- 🔌 WebSocket real-time updates
- 🗄️ PostgreSQL database with optimized indexes
- ⚡ Celery background tasks
- 🐳 Docker containerization

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+ (for local development)
- AirLabs API key (for Aircraft API)
- Celetrak TLE API (for Satellite and Debris)

### Setup

1. **Clone repository**
```bash
git clone <repo-url>
cd backend
```

2. **Create .env file**
```bash
cp .env.example .env
# Edit .env and add your API keys
```

3. **Start services**
```bash
docker-compose up -d
```

4. **Check logs**
```bash
docker-compose logs -f backend
```

5. **Access API**
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

### API Documentation

Once running, access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Aircraft Endpoints
```
GET  /api/v1/aircraft/              # Get all active aircraft
GET  /api/v1/aircraft/hex/{code}    # Get aircraft by hex code
GET  /api/v1/aircraft/bbox          # Get aircraft in bounding box
GET  /api/v1/aircraft/geojson       # Get aircraft as GeoJSON
GET  /api/v1/aircraft/stats         # Get aircraft statistics
```

### Satellite Endpoints
```
GET  /api/v1/satellites/            # Get all satellites
GET  /api/v1/satellites/debris      # Get all debris
GET  /api/v1/satellites/norad/{id}  # Get by NORAD ID
GET  /api/v1/satellites/geojson     # Get as GeoJSON
GET  /api/v1/satellites/stats       # Get statistics
```

### WebSocket Endpoints
```
WS   /api/v1/ws/tracker/{client_id} # Real-time full updates (2s)
WS   /api/v1/ws/stream/{client_id}  # Position-only updates (1s)
```

## WebSocket Usage

### JavaScript Example
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/api/v1/ws/tracker/client-123');

ws.onopen = () => {
  console.log('✅ Connected to tracker');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'update') {
    console.log('Aircraft:', data.data.aircraft.length);
    console.log('Satellites:', data.data.satellites.length);
    console.log('Debris:', data.data.debris.length);
    
    // Update your map with new positions
    updateMap(data.data);
  }
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

ws.onclose = () => {
  console.log('🔌 Disconnected');
};
```

### Python Example
```python
import asyncio
import websockets
import json

async def connect_tracker():
    uri = "ws://localhost:8000/api/v1/ws/tracker/client-python"
    
    async with websockets.connect(uri) as websocket:
        print("✅ Connected")
        
        async for message in websocket:
            data = json.loads(message)
            
            if data['type'] == 'update':
                print(f"Aircraft: {len(data['data']['aircraft'])}")
                print(f"Satellites: {len(data['data']['satellites'])}")

asyncio.run(connect_tracker())
```

## Background Tasks

### Celery Tasks

The system runs periodic background tasks:

- **fetch_aircraft** - Every 10 seconds
- **fetch_satellite_tle** - Every 6 hours
- **update_satellite_positions** - Every 5 seconds
- **cleanup_old_records** - Every hour

### Monitor Tasks
```bash
# View Celery worker logs
docker-compose logs -f celery_worker

# View Celery beat (scheduler) logs
docker-compose logs -f celery_beat
```

## Database Schema

### Aircraft Table
```sql
- id (PRIMARY KEY)
- hex (UNIQUE, INDEXED)
- latitude, longitude (INDEXED)
- altitude, speed, heading
- flight_icao, aircraft_icao, airline_icao
- is_active (INDEXED)
- last_updated (INDEXED)
```

### Satellites Table
```sql
- id (PRIMARY KEY)
- norad_id (UNIQUE, INDEXED)
- name
- latitude, longitude, altitude (INDEXED)
- velocity, inclination, period
- tle_line1, tle_line2
- operator, object_type (INDEXED)
- is_visible, conjunction_risk
- position_updated_at, tle_updated_at
```

### Debris Table
```sql
- id (PRIMARY KEY)
- norad_id (UNIQUE, INDEXED)
- name
- latitude, longitude, altitude
- velocity
- tle_line1, tle_line2
- conjunction_risk, risk_score
- position_updated_at
```

## Development

### Local Setup (without Docker)
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup PostgreSQL and Redis locally
# Update .env with local connection strings

# Run migrations (if using Alembic)
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.tasks worker --loglevel=info

# Start Celery beat (separate terminal)
celery -A app.tasks beat --loglevel=info
```

### Testing
```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# View coverage report
open htmlcov/index.html
```

### Code Quality
```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

## Performance Optimization

### Database Indexes

The system uses optimized indexes for:
- Geographic queries (latitude, longitude)
- Time-based queries (last_updated, position_updated_at)
- ID lookups (hex, norad_id)
- Status filters (is_active, object_type)

### Caching Strategy

- Aircraft data: 10-second refresh
- Satellite TLE: 6-hour refresh
- Satellite positions: 5-second calculation from TLE
- WebSocket updates: 2-second broadcast

### Query Optimization

- Bulk upserts for batch operations
- Indexed columns for fast lookups
- Pagination with limits
- Bounding box queries for viewport filtering

## Monitoring & Logging

### Health Check
```bash
curl http://localhost:8000/health
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f celery_worker

# Follow last 100 lines
docker-compose logs --tail=100 -f backend
```

### Database Access
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U tracker_user -d tracker_db

# Example queries
SELECT COUNT(*) FROM aircraft WHERE is_active = true;
SELECT COUNT(*) FROM satellites;
SELECT COUNT(*) FROM debris;
```

## Troubleshooting

### Common Issues

**1. Database connection error**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres
```

**2. Celery tasks not running**
```bash
# Check Celery worker logs
docker-compose logs celery_worker

# Restart worker
docker-compose restart celery_worker
```

**3. No aircraft data**
```bash
# Check AirLabs API key
echo $AIRLABS_API_KEY

# Manually trigger task
docker-compose exec backend python -c "from app.tasks.fetch_aircraft import fetch_and_store_aircraft; fetch_and_store_aircraft()"
```

**4. WebSocket connection fails**
```bash
# Check CORS settings in app/config.py
# Ensure frontend URL is in CORS_ORIGINS
```

### Reset Database
```bash
# Stop all services
docker-compose down

# Remove database volume
docker volume rm backend_postgres_data

# Start fresh
docker-compose up -d
```

## Deployment

### Production Checklist

- [ ] Set `DEBUG=False` in .env
- [ ] Use strong database passwords
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation
- [ ] Set up automated backups
- [ ] Use environment-specific .env files

### Docker Production Build
```bash
# Build production image
docker build -t tracker-backend:latest .

# Run with production settings
docker run -d \
  -p 8000:8000 \
  --env-file .env.production \
  --name tracker-backend \
  tracker-backend:latest
```

### Scaling
```bash
# Scale Celery workers
docker-compose up -d --scale celery_worker=3

# Scale backend instances (with load balancer)
docker-compose up -d --scale backend=3
```

## Architecture Diagram
```
┌────────────────────────────────────────────────────────┐
│                    External APIs                       │
│  ┌──────────────┐              ┌──────────────┐        │
│  │  AirLabs API │              │  CelesTrak   │        │
│  └──────┬───────┘              └──────┬───────┘        │
└─────────┼─────────────────────────────┼────────────────┘
          │                             │
          ▼                             ▼
┌─────────────────────────────────────────────────────────┐
│                   Celery Tasks                          │
│  ┌──────────────────┐      ┌────────────────────┐       │
│  │ fetch_aircraft   │      │ fetch_satellites   │       │
│  │ (every 10s)      │      │ (TLE: 6h, Pos: 5s) │       │
│  └────────┬─────────┘      └──────────┬─────────┘       │
└───────────┼───────────────────────────┼─────────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                    │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐             │
│  │ Aircraft │  │ Satellites │  │  Debris  │             │
│  └──────────┘  └────────────┘  └──────────┘             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  FastAPI Backend                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐           │
│  │ REST API │  │ WebSocket│  │ Health Check │           │
│  └──────────┘  └──────────┘  └──────────────┘           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                    Frontend                             │
│  ┌──────────────────────────────────────────┐           │
│  │  React + MapTiler SDK + WebSocket        │           │
│  └──────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

## API Response Examples

### Aircraft Response
```json
{
  "hex": "a4b5c6",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "altitude": 35000,
  "speed": 450,
  "heading": 245,
  "flight_icao": "UAL456",
  "aircraft_icao": "B787",
  "airline_icao": "UAL",
  "is_active": true,
  "last_updated": "2025-12-09T10:30:45Z"
}
```

### Satellite Response
```json
{
  "norad_id": "25544",
  "name": "ISS (ZARYA)",
  "latitude": 51.6412,
  "longitude": 112.8495,
  "altitude": 408.5,
  "velocity": 7.66,
  "inclination": 51.64,
  "period_minutes": 92.68,
  "operator": "International Space Station",
  "object_type": "satellite",
  "is_visible": true,
  "conjunction_risk": false
}
```

