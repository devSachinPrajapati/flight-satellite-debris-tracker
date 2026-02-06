# Flight, Satellite and Debris Tracker Backend 

Real-time tracking system backend for aircraft, satellites, and space debris using FastAPI, WebSocket, and Python.

---
## 🚀 Overview

High-performance backend service that aggregates data from **AirLabs** (aircraft) and **CelesTrak** (satellites/debris), processes it using SGP4 propagation, and streams real-time updates via WebSocket to connected clients.

### Key Capabilities

- ✈️ **Real-time Aircraft Tracking** - Fetch and interpolate flight positions
- 🛰️ **Satellite & Debris Tracking** - TLE-based orbital propagation (SGP4)
- 📡 **WebSocket Streaming** - Real-time bidirectional updates every 2 seconds
- 🗄️ **In-Memory Caching** - Fast data retrieval with automatic refresh
- 🔄 **Background Tasks** - Periodic data fetching and position updates
- 🌐 **REST API** - HTTP endpoints for initial data load
- ✈️ **Airport Schedules** - Live arrivals, departures, and delay tracking
---

## Features

- ✈️ Real-time aircraft tracking (AirLabs API)
- 🛰️ Satellite & debris tracking (CelesTrak TLE + SGP4)
- 📊 REST API endpoints
- 🔌 WebSocket real-time updates
- ⚡ Celery background tasks


---
## 📊 Data Sources & API Limitations

### AirLabs API (Free Tier)

**Base URL**: `https://airlabs.co/api/v9`

#### ✅ What's Included (Free Tier)
- **1,000 API requests/day**
- Basic flight data: position (lat/lng), altitude, speed, heading
- Flight identifiers: hex code, flight number, ICAO codes
- Route information: departure/arrival airports
- Aircraft type (aircraft_icao)
- Airline information (airline_icao)
- **Update frequency**: ~60 seconds (API-side)

#### ❌ What's NOT Included (Free Tier)
- ❌ **Real-time updates** - Data delayed by 2-5 minutes
- ❌ **Vertical speed (v_speed)** - Requires paid tier
- ❌ **Flight status** (taxiing, airborne, landed) - Limited
- ❌ **Registration numbers** - Paid tier only
- ❌ **Flight history** - Not available in free tier
- ❌ **High-frequency updates** (<60 seconds) - Rate limited
- ❌ **Global coverage** - Free tier may have geographic limitations
- ❌ **Detailed airline info** - Basic only
- ❌ **Aircraft images** - Not included

**Rate Limits**:
- 1,000 requests/day
- ~42 requests/hour
- Our backend fetches every **60 seconds** to stay within limits

**Data Fields Provided**:
```json
{
  "hex": "a4b5c6",           // ✅ Aircraft ICAO 24-bit address
  "lat": 37.7749,            // ✅ Latitude
  "lng": -122.4194,          // ✅ Longitude  
  "alt": 35000,              // ✅ Altitude (feet)
  "dir": 245,                // ✅ Heading/direction (degrees)
  "speed": 450,              // ✅ Ground speed (knots)
  "v_speed": null,           // ❌ NOT in free tier
  "flight_icao": "UAL456",   // ✅ Flight number
  "aircraft_icao": "B787",   // ✅ Aircraft type
  "airline_icao": "UAL",     // ✅ Airline code
  "arr_icao": "KSFO",        // ✅ Destination
  "dep_icao": "KORD",        // ✅ Origin
  "updated": 1706371200      // ✅ Last update timestamp
}
```

### CelesTrak TLE (Public/Free)

**Base URL**: `https://celestrak.org/NORAD/elements/gp.php`

#### ✅ What's Included (Free/Public)
- **Unlimited access** - No API key required
- Two-Line Element (TLE) sets for all tracked objects
- Updated every **12-24 hours**
- Available groups: stations, starlink, active, debris, etc.
- NORAD catalog numbers
- Orbital elements: inclination, eccentricity, mean motion, etc.
- Epoch time (when TLE was generated)

#### ❌ What's NOT Included (Public TLE)
- ❌ **Real-time positions** - Must calculate using SGP4
- ❌ **Sub-second accuracy** - TLE degrades over time
- ❌ **Collision warnings** - Requires advanced services
- ❌ **Ownership details** - Limited metadata
- ❌ **High-precision ephemeris** - TLE is simplified
- ❌ **Historical TLE sets** - Only current TLE available for free
- ❌ **Radar tracking data** - Not public
- ❌ **Maneuver predictions** - Not included

**Update Frequency**:
- TLE data: Every **12-24 hours** (varies by object)
- Our backend: Refreshes TLE every **6 hours**
- Position calculations: Every **2 seconds** (client-side SGP4)

**Data Format** (TLE):
```
ISS (ZARYA)                           ← Satellite name
1 25544U 98067A   24337.51234567      ← Line 1 (orbital elements)
2 25544  51.6422  339.8014 0006417    ← Line 2 (orbital parameters)
```

**What We Calculate from TLE**:
```json
{
  "norad_id": "25544",       // ✅ From TLE
  "name": "ISS (ZARYA)",     // ✅ From TLE
  "lat": 51.6412,            // ✅ Calculated (SGP4)
  "lng": 112.8495,           // ✅ Calculated (SGP4)
  "altitude": 408.5,         // ✅ Calculated (km)
  "velocity": 7.66,          // ✅ Calculated (km/s)
  "inclination": 51.64,      // ✅ From TLE
  "period_minutes": 92.68,   // ✅ Calculated
  "operator": "ISS",         // ✅ Inferred from name
  "object_type": "satellite" // ✅ Categorized by name
}
```

**TLE Accuracy**:
- ✅ Accurate within **1-5 km** for LEO satellites (first 24 hours)
- ⚠️ Degrades to **10-50 km** after 48 hours
- ⚠️ Geostationary satellites: **50-200 km** accuracy
- ❌ Not suitable for collision avoidance (use LeoLabs for that)

---

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


## Performance Optimization

### Spatial Indexes (R-tree)

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

## 🏗️ Architecture

### System Components

```
┌───────────────────────────────────────────────────────┐
│                  External APIs                        │
│  ┌──────────────┐              ┌──────────────┐       │
│  │ AirLabs API  │              │  CelesTrak   │       │
│  │ (Free Tier)  │              │  (TLE Free)  │       │
│  └──────┬───────┘              └──────┬───────┘       │
└─────────┼─────────────────────────────┼───────────────┘
          │ Every 60s                   │ Every 6h
          ▼                             ▼
┌────────────────────────────────────────────────────────┐
│              FastAPI Backend Services                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Flight Service          Satellite Service        │  │
│  │ - Fetches aircraft      - Fetches TLE            │  │
│  │ - Interpolates pos      - SGP4 propagation       │  │
│  │ - Caches in memory      - Position updates       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Airport Service         WebSocket Manager        │  │
│  │ - Schedules API         - Client connections     │  │
│  │ - Caching (5 min)       - Broadcasts every 2s    │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬─────────────────────────────────┘
                       │ WebSocket + REST
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 Frontend Clients                        │
│         React + TypeScript + MapTiler SDK               │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

**Aircraft Pipeline**:
1. **Fetch** from AirLabs every 60s → `flight_service.py`
2. **Store** in memory cache → `flights_cache: Dict[hex, Aircraft]`
3. **Interpolate** positions between updates (great-circle navigation)
4. **Normalize** to standard format → `SpatialObject`
5. **Broadcast** via WebSocket every 2s → `websocket_manager.py`

**Satellite Pipeline**:
1. **Fetch** TLE from CelesTrak every 6h → `satellite_service.py`
2. **Parse** TLE format → orbital elements
3. **Propagate** positions using SGP4 → lat/lng/alt
4. **Categorize** as satellite or debris
5. **Update** positions every 2s (recalculate from TLE)
6. **Broadcast** via WebSocket → `websocket_manager.py`

**Airport Pipeline**:
1. **Fetch** schedules from AirLabs → `airport_service.py`
2. **Cache** for 5 minutes → Redis/in-memory
3. **REST endpoint** for client queries
4. **Auto-refresh** on client request
---

## 🛠️ Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | FastAPI | 0.104+ | Async web framework |
| **Runtime** | Python | 3.11+ | Backend language |
| **Server** | Uvicorn | Latest | ASGI server |
| **WebSocket** | FastAPI WebSocket | - | Real-time updates |
| **HTTP Client** | httpx | Latest | Async API requests |
| **Validation** | Pydantic | 2.0+ | Data models |
| **Async** | asyncio | Built-in | Concurrent tasks |
| **Math** | NumPy | Latest | Position calculations |
| **Orbital** | Skyfield | Latest | SGP4 propagation |

---

## 📦 Installation

### Prerequisites

- Python 3.11 or higher
- pip (Python package manager)
- Virtual environment (recommended)

### Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
.\venv\Scripts\Activate.ps1

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create .env file
cp .env.example .env

# 6. Edit .env and add API keys
nano .env  # or use your preferred editor
```

### Environment Variables

Create `.env` file in backend root:

```env
# AirLabs API Configuration
AIRLABS_API_KEY=your_airlabs_api_key_here
AIRLABS_BASE_URL=https://airlabs.co/api/v9

# CelesTrak Configuration
CELESTRAK_BASE_URL=https://celestrak.org/NORAD/elements/gp.php

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=true
RELOAD=true

# CORS Settings (Frontend URLs)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Data Update Intervals (seconds)
FLIGHT_UPDATE_INTERVAL=60
SATELLITE_UPDATE_INTERVAL=10
TLE_REFRESH_INTERVAL=21600
AIRPORT_UPDATE_INTERVAL=60

# Cache Settings
CACHE_TTL=300

# API Timeouts (seconds)
API_TIMEOUT=10
```

### Get API Keys

1. **AirLabs API Key** (Required for aircraft data):
   - Visit: https://airlabs.co/
   - Sign up for free account
   - Navigate to Dashboard → API Key
   - Copy your API key
   - Free tier: 1,000 requests/day

2. **CelesTrak** (No API key needed):
   - Public/free access
   - No registration required
   - Direct URL access to TLE data

---

## 🚀 Running the Backend

### Development Server

```bash
# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
.\venv\Scripts\Activate.ps1  # Windows

# Run with auto-reload
python run.py

```

---

## 📡 API Documentation

#### Flight Endpoints

```http
GET /api/flights
Returns all tracked aircraft with current positions

Response: {
  "flights": Aircraft[],
  "count": number,
  "timestamp": string
}
```

```http
GET /api/flights/{hex}
Returns specific aircraft by hex code

Response: Aircraft object
```

#### Satellite Endpoints

```http
GET /api/satellites
Returns all satellites and debris

Response: {
  "satellites": Satellite[],
  "debris": Debris[],
  "count": number,
  "timestamp": string
}
```

```http
GET /api/satellites/{norad_id}
Returns specific satellite by NORAD ID

Response: Satellite object
```

#### Airport Endpoints

```http
GET /api/airports/{airport_code}/schedules
Returns airport arrivals, departures, and delays

Response: {
  "arrivals": Flight[],
  "departures": Flight[],
  "delayed": Flight[],
  "stats": AirportStats
}
```

### WebSocket Endpoint

```http
WS /ws
Real-time updates for aircraft and satellites

Message Format:
{
  "type": "update",
  "data": {
    "aircraft": Aircraft[],
    "satellites": Satellite[],
    "debris": Debris[]
  },
  "timestamp": string
}
```

**Connection Example** (JavaScript):
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Aircraft count:', data.data.aircraft.length);
  console.log('Satellites count:', data.data.satellites.length);
};
```

---


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


## 🔧 Core Services

### 1. Flight Service (`app/services/flight_service.py`)

**Responsibilities**:
- Fetch aircraft data from AirLabs API every 60 seconds
- Cache in memory: `Dict[hex, Aircraft]`
- Interpolate positions between updates using great-circle navigation
- Filter invalid/corrupt data

**Key Functions**:
```python
async def fetch_aircraft_data() -> List[Aircraft]
async def interpolate_position(aircraft: Aircraft) -> Aircraft
async def get_cached_aircraft() -> List[Aircraft]
```

**Configuration**:
- Update interval: 60 seconds (configurable)
- Cache TTL: 5 minutes
- API timeout: 10 seconds
- Max aircraft: 1000

### 2. Satellite Service (`app/services/satellite_service.py`)

**Responsibilities**:
- Fetch TLE data from CelesTrak every 6 hours
- Parse TLE format into orbital elements
- Propagate positions using SGP4 (Skyfield library)
- Update positions every 2 seconds
- Categorize objects (satellite vs debris)

**Key Functions**:
```python
async def fetch_tle_data() -> List[TLEData]
def propagate_position(tle: TLEData, time: datetime) -> Position
async def update_all_positions() -> None
def categorize_object(name: str) -> str
```

**Configuration**:
- TLE refresh: 6 hours
- Position update: 2 seconds
- Groups fetched: stations, starlink, active, debris
- Max satellites: 5000

**SGP4 Propagation**:
1. Parse TLE → orbital elements
2. Initialize satellite record
3. Propagate to current time → ECI coordinates
4. Convert ECI → geodetic (lat/lng/alt)
5. Calculate velocity magnitude

### 3. Airport Service (`app/services/airport_service.py`)

**Responsibilities**:
- Fetch airport schedules from AirLabs
- Cache schedule data (5 minutes TTL)
- Calculate delay statistics
- Provide arrivals, departures, delayed flights

**Key Functions**:
```python
async def fetch_airport_schedule(code: str) -> AirportSchedule
async def get_arrivals(code: str) -> List[Flight]
async def get_departures(code: str) -> List[Flight]
async def get_delayed(code: str) -> List[Flight]
```

### 4. WebSocket Manager (`app/services/websocket_manager.py`)

**Responsibilities**:
- Manage client connections
- Broadcast updates every 2 seconds
- Handle connection lifecycle
- Error recovery and reconnection

**Key Functions**:
```python
async def connect(websocket: WebSocket) -> None
async def disconnect(websocket: WebSocket) -> None
async def broadcast_update(data: dict) -> None
async def send_personal(websocket: WebSocket, data: dict) -> None
```

**Broadcast Strategy**:
- Interval: 2 seconds
- Concurrent broadcast to all clients
- Automatic reconnection on failure
- JSON serialization

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry
│   ├── config.py                  # Configuration settings
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── flights.py             # Flight endpoints
│   │   ├── satellites.py          # Satellite endpoints
│   │   └── airports.py            # Airport endpoints
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── flight_service.py      # Aircraft data fetching
│   │   ├── satellite_service.py   # TLE fetching & SGP4
│   │   ├── airport_service.py     # Airport schedules
│   │   └── websocket_manager.py   # WebSocket handling
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── aircraft.py            # Aircraft Pydantic models
│   │   ├── satellite.py           # Satellite Pydantic models
│   │   └── airport.py             # Airport Pydantic models
│   │
│   └── utils/
│       ├── __init__.py
│       ├── validators.py          # Data validation
│       └── logger.py              # Logging configuration
│
├── requirements.txt               # Python dependencies
├── run.py                         # Development server script
├── .env                           # Environment variables
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
└── README.md                      # This file
```

---

## ⚙️ Configuration

### Flight Service Configuration

```python
# app/services/flight_service.py

FLIGHT_UPDATE_INTERVAL = 60  # seconds (stay within AirLabs free tier)
MAX_AIRCRAFT = 1000
CACHE_TTL = 300  # 5 minutes
API_TIMEOUT = 10  # seconds
INTERPOLATION_ENABLED = True
```

### Satellite Service Configuration

```python
# app/services/satellite_service.py

TLE_REFRESH_INTERVAL = 21600  # 6 hours
POSITION_UPDATE_INTERVAL = 2  # seconds
MAX_SATELLITES = 5000
PARALLEL_FETCH = True

# TLE Groups to fetch
TLE_GROUPS = [
    'stations',      # Space stations (ISS, etc.)
    'starlink',      # Starlink constellation
    'active',        # Active satellites
    'cosmos-2251-debris'  # Debris objects
]
```

### WebSocket Configuration

```python
# app/services/websocket_manager.py

BROADCAST_INTERVAL = 2  # seconds
MAX_CONNECTIONS = 100
RECONNECT_TIMEOUT = 30  # seconds
MESSAGE_QUEUE_SIZE = 1000
```

---

## 🔄 Background Tasks

The backend runs periodic background tasks:

### Task Schedule

| Task | Interval | Service | Purpose |
|------|----------|---------|---------|
| **Fetch Aircraft** | 60 seconds | flight_service | Update aircraft positions |
| **Fetch TLE Data** | 6 hours | satellite_service | Refresh orbital elements |
| **Update Satellite Positions** | 2 seconds | satellite_service | Recalculate positions |
| **Broadcast Updates** | 2 seconds | websocket_manager | Send to clients |
| **Airport Schedules** | 60 seconds | airport_service | Update schedules |

### Task Lifecycle

```python
# app/main.py

@app.on_event("startup")
async def startup_event():
    # Initialize services
    await flight_service.initialize()
    await satellite_service.initialize()
    
    # Start background tasks
    asyncio.create_task(flight_service.periodic_update())
    asyncio.create_task(satellite_service.periodic_update())
    asyncio.create_task(websocket_manager.broadcast_loop())

@app.on_event("shutdown")
async def shutdown_event():
    # Cleanup
    await flight_service.cleanup()
    await satellite_service.cleanup()
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. AirLabs API Rate Limit

**Error**: `429 Too Many Requests`

**Solution**:
```bash
# Increase update interval in .env
FLIGHT_UPDATE_INTERVAL=120  # 2 minutes instead of 60 seconds
```

#### 2. TLE Fetch Failure

**Error**: `Failed to fetch TLE data`

**Solution**:
- Check internet connection
- Verify CelesTrak URL is accessible
- Increase timeout in config
- Check if CelesTrak is down: https://celestrak.org/

#### 3. WebSocket Connection Drops

**Error**: `WebSocket disconnected`

**Solution**:
- Check CORS settings in `.env`
- Verify frontend URL in `CORS_ORIGINS`
- Increase reconnect timeout
- Check firewall/proxy settings

#### 4. No Aircraft Data

**Error**: `No aircraft returned`

**Solution**:
```bash
# Verify API key
echo $AIRLABS_API_KEY

# Test API directly
curl "https://airlabs.co/api/v9/flights?api_key=YOUR_KEY"

# Check logs
tail -f logs/backend.log
```

#### 5. High Memory Usage

**Issue**: Backend consuming >500MB RAM

**Solution**:
```python
# Reduce cache sizes in config
MAX_AIRCRAFT = 500  # Instead of 1000
MAX_SATELLITES = 2000  # Instead of 5000
```

---

## 📊 Performance Metrics

### Typical Performance

| Metric | Value | Notes |
|--------|-------|-------|
| **Startup Time** | 1-2 seconds | Non-blocking initialization |
| **API Response Time** | <50ms | Cached data |
| **WebSocket Latency** | <10ms | Local network |
| **Memory Usage** | 150-250 MB | With 1000 aircraft, 5000 satellites |
| **CPU Usage** | 5-10% | Idle, 20-30% during updates |
| **Concurrent Clients** | 100+ | WebSocket connections |

### Optimization Tips

1. **Reduce Update Frequency**: Increase intervals to reduce API calls
2. **Limit Object Count**: Set max limits for aircraft/satellites
3. **Enable Caching**: Use Redis for persistent caching
4. **Use Connection Pooling**: For database connections
5. **Profile Code**: Use `cProfile` to find bottlenecks

---

## 🔐 Security Considerations

### API Key Protection

- ✅ Store in `.env` file (not committed to git)
- ✅ Use environment variables
- ✅ Never expose in frontend code
- ✅ Rotate keys periodically

### CORS Configuration

```python
# app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Specific origins only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### Health Check Endpoint

```http
GET http://localhost:8000/api/health

Response:
{
  "status": "healthy",
  "timestamp": "2026-02-06T19:23:30.509578",
  "loading_status": {
    "flights_ready": true,
    "flights_loading": false,
    "satellites_ready": true,
    "satellites_loading": false,
    "spatial_ready": true,
    "spatial_loading": false
  },
  "data_counts": {
    "flights": 8572,
    "satellites": 14570
  },
  "spatial": {
    "store": {
      "total": 23140,
      "aircraft": 8572,
      "satellites": 14294,
      "debris": 274,
      "memory_mb": 22.6,
      "last_update": {
        "celestrak": "2026-02-06T19:23:29.977718",
        "airlabs": "2026-02-06T19:23:22.701979"
      }
    },
    "index": {
      "size": 23140,
      "depth": 2,
      "estimated_memory_mb": 2.20680236816406,
      "processing": {
        "total_processed": 31714,
        "total_rejected": 2,
        "rejection_rate": "0.01%",
        "rejection_reasons": {
          "invalid_coordinates": 2
        },
        "last_flights_count": 8572,
        "last_satellites_count": 14568
      },
      "last_rebuild": "2026-02-06T19:23:30.111961"
    }
  },
  "services": {
    "flights": true,
    "satellites": true,
    "spatial": true
  },
  "connections": 0
}
```

---
