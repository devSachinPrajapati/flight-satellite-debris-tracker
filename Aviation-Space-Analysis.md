# Live Aircraft Flight Tracker & LEOLabs Satellite Visualization
---

## Project Overview

Your mission is to build a **high-performance real-time tracking system** that visualizes:
1. **Live aircraft positions** with flight data across global airspace
2. **LEO satellite positions** and orbital debris tracked by LeoLabs
3. **Integrated visualization** showing both aviation and space domains
4. **Optimized browser rendering** handling 10,000+ tracked objects simultaneously

This is a performance-intensive project requiring advanced optimization techniques, WebGL rendering, and strategic data management.

### Key Deliverables
- Live aircraft tracking with real-time position updates
- LEOLabs satellite/debris integration with orbital visualization
- MapTiler SDK integration for geographic context
- Performance-optimized browser rendering (60+ fps with 10k+ objects)
- Production-ready architecture handling scale and real-time data (Do not stress too much on this since we will first build a POC)

---

## Task 1: Live Aircraft Flight Tracker Integration

### Objective
Integrate real-time flight tracking APIs to display live aircraft positions globally.

### Available Flight Tracking APIs

**Option 1: Flightradar24 API** (Premium, Best Coverage, If needed api key will be provided to you on your demand)
- **Endpoint:** [fr24api.flightradar24.com](https://fr24api.flightradar24.com)
- **Update Frequency:** Real-time (2-3 second updates)
- **Coverage:** 180+ countries, 99%+ global coverage (check for India)
- **Data Accuracy:** ±5-10 meters horizontal, ±15 meters vertical
- **Authentication:** API Key + OAuth2
- **Rate Limits:** 500-2000 requests/minute depending on tier

**Data Available:**
- Aircraft position (lat, lng, altitude)
- Speed (ground speed, vertical speed)
- Heading/track
- Aircraft registration (N-number, ICAO code)
- Flight number and airline
- Departure/arrival airports
- Aircraft type and model
- Squawk code

**Option 2: AirLabs API** (Free tier available, Good coverage)
- **Endpoint:** [airlabs.co](https://airlabs.co/docs/flights)
- **Update Frequency:** Every 2-5 minutes
- **Coverage:** 150+ countries
- **Rate Limits:** 50 requests/hour (free), unlimited (premium)
- **Data Quality:** Commercial, proven reliability
- **Bounding Box Queries:** Reduce API calls by fetching only target regions

**Sample API Response: (Double check since the example is taken from google ai search)**
```json
{
  "response": [
    {
      "hex": "a4b5c6",
      "flag": "US",
      "lat": 37.7749,
      "lng": -122.4194,
      "alt": 35000,
      "dir": 245,
      "speed": 450,
      "v_speed": 1200,
      "flight_number": "UAL456",
      "flight_icao": "UAL456",
      "arr_iata": "LAS",
      "arr_icao": "KLAS",
      "dep_iata": "SFO",
      "dep_icao": "KSFO",
      "aircraft_icao": "B787",
      "airline_icao": "UAL",
      "updated": 1732691400
    }
  ]
}
```

**Option 3: Aviation Edge API** (Real-time, Reliable)
- **Update Frequency:** 3-5 minute updates
- **Free Tier:** Yes (limited)
- **Coverage:** Global
- **Historical Data:** Available

**Option 4: Aviationstack** (Scalable, Cloud Infrastructure)
- Handles thousands to millions of requests per minute
- Real-time flight status and tracking
- Comprehensive airline/aircraft metadata
- Built-in caching and performance optimization

### Implementation Strategy (Best Practices and Optimization, required after POC)

**Step 1: API Key Management**
```
Environment Variables:
  - FLIGHTRADAR24_API_KEY
  - AIRLABS_API_KEY
  - Aviation Edge Key (optional fallback)

Rate Limiting (Development Stage, so keep in mind but no need for the POC):
  - Implement token bucket algorithm
  - Queue requests during peak load
  - Cache responses (30-60 second TTL)
```

**Step 2: Data Fetching Strategy**
```
Approach A: Global Fetch (Simplest)
  - Query entire world every 5-10 seconds
  - 10,000-100,000 aircraft at any time
  - High bandwidth cost
  - Best for demonstration

Approach B: Bounding Box Fetching (Recommended) (Crucial Implementation)
  - Divide world into grid cells
  - Fetch only visible viewport + buffer
  - Request only changed data
  - Reduces bandwidth by 80-95%

Approach C: Hybrid with WebSocket (Advanced) (Crucial)
  - Maintain persistent connection for critical airspace
  - Fallback to API polling for other regions
  - Real-time updates in focus area
  - Polling updates in background
```

**Step 3: Data Normalization**
```javascript
// Normalize different API responses to common schema
interface Aircraft {
  hex: string;              // Unique aircraft identifier (ICAO hex)
  position: [number, number]; // [lat, lng]
  altitude: number;         // feet
  speed: number;            // knots
  heading: number;          // degrees 0-360
  vertical_speed: number;   // feet per minute
  flight_number: string;    // ICAO flight number
  departure_airport: string; // IATA code
  arrival_airport: string;  // IATA code
  aircraft_type: string;    // ICAO aircraft type
  airline: string;          // ICAO airline code
  timestamp: number;        // Unix timestamp
  source: string;           // 'flightradar24' | 'airlabs' | 'aviation_edge'
}
```

**Step 4: Real-time Updates**
```
Update Cycle:
  ┌─────────────────────────────────────┐
  │ Check viewport bounds               │
  └─────────────────────────────────────┘
           ↓
  ┌─────────────────────────────────────┐
  │ Fetch aircraft in region + buffer   │
  │ Respecting rate limits              │
  └─────────────────────────────────────┘
           ↓
  ┌─────────────────────────────────────┐
  │ Parse and normalize data            │
  └─────────────────────────────────────┘
           ↓
  ┌────────────────────────────────────────┐
  │ Interpolate positions (between updates)│
  │ for smooth animation                   │
  └────────────────────────────────────────┘
           ↓
  ┌─────────────────────────────────────┐
  │ Update store/state                  │
  │ Trigger re-render                   │
  └─────────────────────────────────────┘
           ↓
  Wait 5-10 seconds, repeat
```

### GeoJSON Schema for Aircraft

```json
{
  "type": "Feature",
  "properties": {
    "id": "a4b5c6",
    "flight": "UAL456",
    "airline": "United Airlines",
    "aircraft": "Boeing 787-9",
    "departure": "SFO",
    "arrival": "LAS",
    "altitude": 35000,
    "speed": 450,
    "heading": 245,
    "v_speed": 1200,
    "status": "en-route",
    "source": "flightradar24"
  },
  "geometry": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  }
}
```

### Research Tasks

- [ ] Compare API coverage for Indian airspace
- [ ] Evaluate free tier limitations and costs
- [ ] Test API response times during peak hours
- [ ] Document rate limiting strategies
- [ ] Create cost-benefit analysis for each API
- [ ] Test data accuracy against known flight paths

---

## Task 2: LEOLabs Satellite & Debris Tracking Integration (Research where and how we can get the data required)

### Objective
Integrate LEOLabs satellite tracking API for real-time LEO object visualization.

### LEOLabs Platform Overview

**LeoLabs Capabilities:**
- **Real-time SSA** (Space Situational Awareness) for LEO objects
- **24/7 Tracking** via global radar network
- **Debris Tracking** - tracks space debris down to ~10cm diameter
- **Conjunction Warnings** - collision avoidance alerts
- **API Access** - RESTful API for integration
- **Update Frequency** - Multiple passes per day per satellite

**Data Available from LEOLabs:**
- Satellite/debris position (lat, lng, altitude, accuracy)
- Orbital parameters (semi-major axis, eccentricity, inclination, period)
- Velocity vectors (x, y, z components)
- Covariance matrix (position uncertainty)
- Conjunction assessments (collision risk with other objects)
- Object classification (satellite vs. debris)
- Ownership/operator information

### LEOLabs API Integration

**Authentication:**
```
API Key via HTTP Header:
  Authorization: Bearer YOUR_API_KEY

Or query parameter:
  ?key=YOUR_API_KEY
```

### Orbital Mechanics Primer

**Essential Concepts:**

**1. Keplerian Elements (6 parameters defining orbit):**
- **Semi-major Axis (a):** Average orbital radius
- **Eccentricity (e):** Orbit shape (0 = circle, 0.5-1 = ellipse)
- **Inclination (i):** Angle from equator (0° = equatorial, 90° = polar)
- **Right Ascension of Ascending Node (RAAN/Ω):** Orientation in space
- **Argument of Perigee (ω):** Position in orbit
- **Mean Anomaly (M):** Current position along orbit

**2. Altitude Classifications:**
- **LEO:** 200-2000 km (ISS ~408 km, most satellites)
- **MEO:** 2000-35786 km (GPS, GLONASS)
- **GEO:** 35786 km (Geostationary, weather satellites)

**3. Position Calculation:**
```
Two-line Element (TLE) → Kepler Elements → SGP4/SDP4 Propagation → ECI Coordinates → Geographic Position (lat/lng)

TLE Example (ISS):
1 25544U 98067A   21123.05235908  .00002182  00000-0  41420-4 0  9990
2 25544  51.6461  339.8014 0002571  34.5857 120.4689 15.48919393286142
```

**4. Coordinate Systems:**
- **ECI (Earth Centered Inertial):** Fixed relative to stars
- **ECEF (Earth Centered Earth Fixed):** Rotates with Earth
- **Geographic (lat/lng/alt):** User-friendly Earth surface coordinates

### Implementation Strategy

**Step 1: TLE Data Management**
```
Option A: Get TLEs from LEOLabs API
  - Most current data
  - Pre-validated
  - Requires API access

Option B: Supplement with N2YO.com API
  - Free TLE source
  - Updates regularly
  - Historical availability
  
Option C: CelesTrak (https://celestrak.org)
  - Standard TLE repository
  - Free, bulk downloads
  - Excellent documentation
```

**Step 2: Orbital Propagation**
```javascript
// Use satellite.js library (popular, well-maintained) if you find something better fell free to use that with a valid reason of change
import { 
  twoline2satrec,
  propagate,
  eciToGeodetic,
  ecfToLla 
} from 'satellite.js';

// Parse TLE
const satrec = twoline2satrec(line1, line2);

// Compute position at given date
const positionAndVelocity = propagate(satrec, new Date());

// Convert ECI to geographic
const gdPos = eciToGeodetic(positionAndVelocity.position);
// gdPos = { latitude, longitude, height }
```

**Step 3: Real-time Updates**
```
Update Cycle:
  ┌─────────────────────────────────────┐
  │ Every 6 hours:                      │
  │ Fetch fresh TLE data from LEOLabs   │
  │ or CelesTrak                        │
  └─────────────────────────────────────┘
           ↓
  ┌─────────────────────────────────────┐
  │ Every 1-5 seconds:                  │
  │ Propagate all objects to current    │
  │ time using SGP4 algorithm           │
  └─────────────────────────────────────┘
           ↓
  ┌─────────────────────────────────────┐
  │ Convert ECI → Geographic coords     │
  │ Compute visibility from observer    │
  └─────────────────────────────────────┘
           ↓
  ┌─────────────────────────────────────┐
  │ Update visualization data           │
  └─────────────────────────────────────┘
```

**Step 4: Filtering by Visibility**
```javascript
// Show only objects that are:
// 1. Visible from ground (above local horizon)
// 2. Illuminated (in sunlight, not in Earth shadow)
// 3. In altitude range of interest

function isObjectVisible(lat, lng, objAltitude) {
  // Calculate horizon distance based on observer altitude
  const EARTH_RADIUS = 6371; // km
  const horizonDistance = Math.acos(EARTH_RADIUS / (EARTH_RADIUS + objAltitude));
  
  // Check if object is above horizon and illuminated
  // (avoid showing objects in Earth shadow)
  
  return isAboveHorizon && isInSunlight;
}
```

### GeoJSON Schema for Satellites

```json
{
  "type": "Feature",
  "properties": {
    "norad_id": "25544",
    "name": "ISS (ZARYA)",
    "object_type": "satellite",
    "altitude": 408,
    "velocity": 7.66,
    "inclination": 51.6412,
    "period_minutes": 92.68,
    "operator": "International Space Station",
    "epoch": "2025-11-27T12:00:00Z",
    "decay_date": null,
    "conjunction_risk": false,
    "visible": true
  },
  "geometry": {
    "type": "Point",
    "coordinates": [112.8495, 51.6412, 408000]  // [lng, lat, altitude in meters]
  }
}
```

---

## Task 3: MapTiler SDK Understanding & Integration

### Objective
Master MapTiler SDK for geographic visualization with two separate datasets.

### MapTiler Foundation Review

**Recall from Ocean Analysis Project:**
- MapTiler SDK JS - Web-based map rendering
- GeoJSON sources for custom data
- Layer styling with paint/layout properties
- Real-time layer updates

**Additional concepts for this project: (Very Crucial)**
- 3D elevation visualization (terrain)
- Performance with high-density point layers
- Layer clustering and aggregation
- Viewport-based data loading

### Layer Structure for Dual Tracking

```
User Interface & Controls
        ↓
┌──────────────────────────────────────────┐
│ Domain Toggles                           │
│ ├─ Aviation Layer (toggle on/off)        │
│ ├─ Satellite Layer (toggle on/off)       │
│ ├─ Debris Layer (toggle on/off)          │
│ ├─ Show Trails (on/off)                  │
│ └─ Show Altitudes/Orbits (on/off)        │
└──────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────┐
│ MapTiler SDK Map                         │
│  ┌──────────────────────────────────────┐│
│  │ Base Layer (Satellite/Street/Terrain)││
│  ├──────────────────────────────────────┤│
│  │ Aircraft Positions (Points)          ││
│  ├──────────────────────────────────────┤│
│  │ Aircraft Flight Paths (Lines)        ││
│  ├──────────────────────────────────────┤│
│  │ Aircraft Clusters (at zoom out)      ││
│  ├──────────────────────────────────────┤│
│  │ Satellite Orbits (Lines)             ││
│  ├──────────────────────────────────────┤│
│  │ Satellite Positions (Points)         ││
│  ├──────────────────────────────────────┤│
│  │ Debris Positions (Points, smaller)   ││
│  ├──────────────────────────────────────┤│
│  │ Conjunction Alerts (highlighted)     ││
│  └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

---

## Task 4: Performance Optimization for Heavy Browser Visualization

### Objective
Achieve 60+ fps rendering with 10,000+ aircraft and satellites simultaneously.

### Performance Challenges

**The Problem:**
- Aircraft: 10,000-100,000 active globally
- Satellites: 8,000+ tracked by LEOLabs
- Debris: 30,000+ pieces > 10cm
- **Total: 50,000+ objects to potentially display**

**Browser Limitations:**
- SVG: ~1,000 objects max at 60fps
- Canvas: ~10,000 objects at 60fps
- WebGL: 1,000,000+ objects possible
- MapTiler uses WebGL under-the-hood (good!)

### Performance Optimization Strategy (Do your own thorough research as well)

#### 1. Viewport-Based Data Loading

**Concept:** Only render objects visible in current viewport + buffer zone
crucial to be implemented during the poc phase

**Benefits:**
- Reduces rendered objects from 50,000 to ~1,000-2,000
- 60+ fps easily achievable
- Efficient memory usage
- Smooth panning and zooming

#### 2. Data Clustering

**Concept:** Group nearby objects at lower zoom levels

**Benefits:**
- Seamless transition from overview to detail
- No "pop-in" visual jank
- Matches user mental model (zoom = detail)

#### 3. Level-of-Detail (LOD) Rendering

**Concept:** Render different object representations based on zoom level

#### 4. Virtual Layer Updates

**Concept:** Update only changed objects, not the entire dataset

#### 5. Worker Thread Data Processing

**Concept:** Offload heavy computations to Web Workers

**Benefits:**
- Main thread stays responsive
- No UI freezing during heavy processing
- Smooth interactions during data updates

#### 6. Memory Management

**Concept:** Efficiently manage memory to prevent garbage collection pauses

#### 7. Network Optimization

**Concept:** Reduce data transfer volume and frequency

### Performance Monitoring

**Concept:** Track performance logs of tasks

### Best Practices Checklist

### Benchmarking Targets

| Scenario | Target FPS | Max Objects | Network |
|----------|-----------|-------------|---------|
| Pan/Zoom | 60+ | 2,000 | N/A |
| Real-time Updates | 30+ | 5,000 | <50ms |
| Initial Load | - | All | <5s |
| Memory Usage | - | - | <500MB |

---

## Task 5: Integrated Dual-Domain Visualization

### Objective
Create seamless visualization combining aviation and space domains.

### UI/UX Considerations

**Layered Presentation:**
```
Primary View: MapTiler base map with all layers
  ├─ Toggle Aviation (all aircraft)
  ├─ Toggle Satellites (all tracked objects)
  ├─ Toggle Debris (optional, high clutter)
  ├─ Show Trails (on/off)
  └─ Show Orbits (on/off)

Secondary View: Stats Panel
  ├─ Active Aircraft Count
  ├─ Active Satellites
  ├─ Potential Conjunctions/Conflicts
  ├─ System FPS
  └─ Data Last Updated
```

**Color Coding System: (You do not have to stick to it strictly just a guide, free to use your own design choice)**
- Aircraft: Blue (#3498db)
- Commercial Satellites: Green (#2ecc71)
- Military Satellites: Orange (#e67e22)
- Debris: Red (#e74c3c)
- Conjunction Risk: Purple (#8e44ad)

### Real-Time Update Orchestration

To ensure seamless real-time updates across both aviation and space domains, implement a unified update loop that:

- Periodically fetches and normalizes new aircraft and satellite data based on the current viewport and user-selected layers.
- Interpolates positions between updates for smooth animation and transitions.
- Efficiently updates only changed objects in the visualization to minimize rendering overhead.
- Coordinates state updates and triggers re-renders in response to new data, user interactions, or detected events (e.g., conjunctions).
- Utilizes worker threads for heavy computations to keep the UI responsive.

This orchestration guarantees synchronized, high-performance updates for all tracked objects, maintaining a fluid and accurate user experience.

---

### Code Quality Standards
DO not stress too much, since for POC speed over quality is required, **strictly maintian docs and roadmaps**, so during the production level build the only hurdles would be the code quality, modularity and best practices while the logic is already implemented and in our palms to replicate just in a better, scalabe, readable and more robust way.

POC -> Robust and the best possible logic with performance optimization
Actual Development -> POC + human readable code, proper directory structure and other best pracrices that might have been missed and a complete code review by me.

**Requirements:**
- [ ] TypeScript with strict mode
- [ ] ESLint (airbnb config)
- [ ] Prettier formatting
- [ ] >70% test coverage
- [ ] No hardcoded API keys
- [ ] Comprehensive error handling
- [ ] Performance budget: <5s initial load, 60+ fps interactions
- [ ] Memory budget: <500MB total

**Architecture Patterns:**
- [ ] Separation of concerns (data layer, render layer, UI layer)
- [ ] State management (Redux/Zustand)
- [ ] Event-driven updates
- [ ] Dependency injection for testability

---

## Advanced Learning Topics

As you progress, explore:
- **3D Visualization:** Three.js for 3D orbit rendering
- **Predictive Analytics:** Machine learning for conjunction prediction
- **Real-time Communication:** WebSocket for live updates
- **Distributed Systems:** Scaling to multiple servers
- **Advanced Rendering:** Shader optimization for WebGL
- **Mobile Optimization:** Responsive design for tablets/phones
- **Security:** API key management, CORS handling
- **Deployment:** Cloud infrastructure, CDN strategies

---

## Resource Links

**Flight Tracking APIs:**
- [Flightradar24 API](https://fr24api.flightradar24.com)
- [AirLabs Flight API](https://airlabs.co/docs/flights)
- [Aviation Edge](https://aviation-edge.com)
- [Aviationstack](https://aviationstack.com)

**LEOLabs & Satellite Tracking:**
- [LeoLabs Platform](https://platform.leolabs.space)
- [satellite.js GitHub](https://github.com/shashwatak/satellite-js)
- [N2YO API](https://www.n2yo.com/api/)
- [CelesTrak TLE Data](https://celestrak.org)

**Performance & Rendering:**
- [MapTiler Documentation](https://docs.maptiler.com/)
- [D3.js WebGL Rendering](https://blog.scottlogic.com/2020/05/01/rendering-one-million-points-with-d3.html)
- [WebGL Best Practices](https://blog.pixelfreestudio.com/how-to-optimize-webgl-for-high-performance-3d-graphics/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)

**Open-source Libraries:**
- [satellite.js](https://github.com/shashwatak/satellite-js) - TLE propagation
- [Supercluster](https://github.com/mapbox/supercluster) - Geospatial clustering
- [turf.js](https://turfjs.org/) - Geospatial analysis
- [three.js](https://threejs.org/) - 3D rendering

---

**Document everything and map your steps**