# Flight, Satellite & Debris Live Tracker (POC)
A real-time web-based tracker that visualizes **aircraft**, **satellites**, and **space debris** on an interactive 3D globe.  
This project is a **Proof of Concept (POC)** demonstrating real-time geospatial rendering, TLE propagation, and live API-driven updates using modern frontend technologies.

---

## Overview

This POC showcases how to:
- Fetch **live aircraft data** using AirLabs API  
- Fetch **satellite & debris orbital data** using CelesTrak TLE feeds  
- Convert TLE → real-time lat/lon/alt using `satellite.js`  
- Render dynamic objects on a 3D map using **MapTiler + MapLibre**  
- Implement **real-time movement and periodic updates**  
- Provide a unified UX for tracking aerial & orbital objects

This prototype focuses on clarity, simplicity, and end-to-end integration, not on production scalability.

---

## Technology Stack

**Frontend Framework**
- React 19 + TypeScript  
- Vite for fast development

**Mapping**
- MapTiler SDK  
- MapLibre GL

**APIs**
- **AirLabs API** (Aircraft Data)  
- **CelesTrak TLE feeds** (Satellites & Debris Data)

**Utilities**
- `satellite.js` for orbital propagation  
- Tailwind CSS for UI  
- Custom hooks for live data polling

---

## Data Sources & Design Decisions

### ✈️ Aircraft Data — *AirLabs API*
We selected **AirLabs** (instead of FlightRadar24) because:
- FR24 API is **paid** & not publicly documented  
- AirLabs offers a **free tier** suitable for POC  
- Simple REST endpoints  
- Good global coverage (~500 aircraft visible in POC)

**Tradeoffs**
- AirLabs provides fewer metadata fields than FR24  
- Lower positional refresh frequency  
- Occasional rate limits in free tier

**If FR24 was used**
- Higher refresh rate  
- Richer aircraft metadata (model, manufacturer, vertical speed, etc.)  
- More accurate & dense coverage  
- But requires **paid access** and backend proxying

---

### 🛰️ Satellite & Debris Data — *CelesTrak (TLE)*
We selected **CelesTrak** instead of LeoLabs because:
- LeoLabs is **paid** and API access requires enterprise plans  
- CelesTrak provides **public, free, reliable TLE datasets**  
- Perfect for TLE-based orbit propagation  
- Works well for POC scale (100–150 satellites)

**Tradeoffs**
- TLEs are updated every ~12–24 hours  
- Real-time positional accuracy is lower compared to LeoLabs  
- No advanced metadata (collision warnings, ownership, radar tracking)

**If LeoLabs was used**
- Highly accurate tracking  
- Real-time radar measurements  
- Debris catalogs with fine granularity  
- But **expensive** & requires backend authentication

---

## Features Implemented in the POC

### ✔ Real-time Aircraft Tracking
- 500+ aircraft updated every few seconds  
- Live movement based on AirLabs positional updates  
- Smooth animations on the 3D globe

### ✔ Real-time Satellite & Debris Tracking
- 107 satellites & 21 debris objects  
- Positions updated every few seconds  
- TLE-based propagation using `satellite.js`  
- Distinct styling for satellites vs debris

### ✔ Unified Interactive Map
- Globe view using MapTiler  
- Smooth panning, zooming, rotation  
- Object clustering (if added later)

### ✔ Efficient Data Refreshing
- Smart intervals (not too frequent, not too slow)  
- Aircraft data: Every 10 seconds
- Satellite data: Every 10 seconds
- Map markers: Real-time rendering

### 🌍 Globe View (3D Earth Mode)

The application now supports a **switchable Globe View** using MapTiler SDK’s native 3D projection mode.  
This enables a more realistic visualization of **satellite orbits**, **space debris**, and **aircraft movement** across the Earth.

- Uses MapTiler’s **built-in globe projection** (`globe` mode)
- Smooth toggle between **2D Map View** and **3D Globe View**
- All existing aircraft, satellite, and debris markers remain fully functional
- Live tracking continues seamlessly in both views
- No extra rendering engines (Three.js, Three-Globe, Cesium, etc.)
- Zero breaking changes to the existing codebase

**Satellite orbits look more realistic on a 3D globe**, compared to a flat Web Mercator CRS map.  

Switching to Globe View enhances the visual understanding of trajectories and orbital paths.

#### 🧠 How It Works
- We reuse the **same MapContainer** and **same markers**
- When the user selects “Globe” view:
  - `map.setProjection({ name: "globe" })` is applied
  - Camera pitch & zoom are adjusted for a 3D experience
- When switching back to "Map" view:
  - Projection returns to `mercator`
  - Camera resets to flat-view defaults

No additional APIs or libraries were required.

#### 🖼 UI Update
A new **Globe / Map toggle** was added to the ViewMode selector:
Map | Globe
This allows users to switch instantly between views.

---

## Architecture (High Level)
```mermaid
flowchart TD

    subgraph API_Sources["External Data Sources"]
        A1["AirLabs API - Live Aircraft Data"]
        A2["CelesTrak TLE Feeds - Satellites & Debris"]
    end

    subgraph Frontend["Frontend Application - React + TypeScript + Vite"]
        F1["Data Fetching Layer - Custom Hooks"]
        F2["Satellite.js - TLE Propagation"]
        F3["Data Normalization - Unified Object Model"]
        F4["Map Rendering - MapTiler + MapLibre"]
    end

    A1 -->|Aircraft JSON| F1
    A2 -->|TLE Text Files| F1

    F1 --> F2
    F2 --> F3
    F3 --> F4

    classDef api fill:#f6d5ff,stroke:#bb80ff,stroke-width:1px,color:#000;
    classDef fe fill:#d6f0ff,stroke:#6bb4ff,stroke-width:1px,color:#000;

    class API_Sources,A1,A2 api;
    class Frontend,F1,F2,F3,F4 fe;
```
---

## Installation
```bash
# Clone the repository
git clone <repository-url>
cd flight-satellite-tracker

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

## 🔑 API Keys Setup

Edit `.env` file and add your API keys:
```env
VITE_MAPTILER_API_KEY=your_maptiler_key
VITE_AIRLABS_API_KEY=your_airlabs_key
```

### Get API Keys:
- **MapTiler**: https://www.maptiler.com/ (Free tier available)
- **AirLabs**: https://airlabs.co/ (Free tier: 50 requests/hour)

## Running the Project
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📁 Project Structure & Architecture

### Directory Overview

```
src/
├── components/           # React components
│   ├── Globe/           # Globe-specific visualization (future extensions)
│   ├── Layout/
│   │   └── MainLayout.tsx        # Main app layout wrapper
│   ├── Map/
│   │   ├── MapContainer.tsx      # MapTiler/MapLibre integration
│   │   └── MapMarker.tsx         # Individual marker rendering
│   └── UI/
│       ├── Header.tsx            # App header
│       ├── Footer.tsx            # App footer
│       ├── StatsPanel.tsx        # Real-time statistics display
│       ├── ObjectDetailsCard.tsx # Detailed object information modal
│       ├── ViewModeToggle.tsx    # View mode selector (All/Aircraft/Satellite/Debris)
│       └── MapViewToggle.tsx     # 2D Map / 3D Globe toggle
├── services/             # External API & data fetching
│   ├── api.ts            # API configuration & fetch utilities
│   ├── aircraftService.ts        # Aircraft data fetching & normalization
│   └── satelliteService.ts       # Satellite/debris data fetching & SGP4 propagation
├── hooks/                # Custom React hooks for data management
│   ├── useAircraftData.ts        # Aircraft data polling & state management
│   ├── useSatelliteData.ts       # Satellite data polling & position updates
│   ├── useMapControls.ts         # View mode & selection state
│   └── useFPS.ts         # Performance monitoring (FPS counter)
├── types/
│   └── index.ts          # TypeScript interfaces & types
├── utils/                # Helper functions
│   ├── coordinates.ts    # Coordinate calculations (distance, validation, conversion)
│   ├── formatting.ts     # Data formatting utilities
│   ├── satelliteUtils.ts # Satellite-specific utilities & GeoJSON conversion
│   └── tleParser.ts      # TLE parsing & orbital element extraction
├── App.tsx               # Main application component & orchestration
└── main.tsx              # React entry point
```

---

## 🔄 Data Flow Architecture

Here's how data flows through the application from source to visualization:

```mermaid
graph TD
    subgraph DS["External Data Sources"]
        AL["AirLabs API<br/>Live Aircraft Data"]
        CT["CelesTrak TLE<br/>Satellite & Debris Orbits"]
    end

    subgraph SVC["Services Layer"]
        API["api.ts"]
        AS["aircraftService.ts"]
        SS["satelliteService.ts"]
    end

    subgraph HOOKS["Custom React Hooks"]
        UAD["useAircraftData.ts"]
        USD["useSatelliteData.ts"]
        UMC["useMapControls.ts"]
        UFP["useFPS.ts"]
    end

    subgraph APPCOMP["App Component"]
        APP["App.tsx"]
    end

    subgraph COMPVIS["Components Layer"]
        MC["MapContainer.tsx"]
        MM["MapMarker.tsx"]
        UI["UI Components"]
    end

    subgraph UTIL["Utility Modules"]
        UT["utilities"]
    end

    AL -->|JSON| AS
    CT -->|TLE Text| SS
    API -->|utilities| AS
    API -->|utilities| SS
    AS -->|aircraft| UAD
    SS -->|satellites, debris| USD
    UAD -->|data| APP
    USD -->|data| APP
    UMC -->|state| APP
    UFP -->|fps| APP
    APP -->|objects| MC
    APP -->|objects| MM
    MC -->|map| APP
    MM -->|markers| MC
    SS -->|SGP4| USD
    UT -->|helpers| SS
    UT -->|helpers| UI
    APP -->|data| UI

    classDef source fill:#ffe6e6,stroke:#cc0000,stroke-width:2px
    classDef service fill:#fff9e6,stroke:#ff9900,stroke-width:2px
    classDef hook fill:#e6f3ff,stroke:#0066cc,stroke-width:2px
    classDef main fill:#e6ffe6,stroke:#00cc00,stroke-width:2px
    classDef comp fill:#f0e6ff,stroke:#9900cc,stroke-width:2px
    classDef util fill:#ffe6f0,stroke:#cc0099,stroke-width:2px

    class AL,CT source
    class API,AS,SS service
    class UAD,USD,UMC,UFP hook
    class APP main
    class MC,MM,UI comp
    class UT util
```

---

## ✈️ Aircraft Data Pipeline

### 1. **Data Source: AirLabs API**
- **Endpoint**: `https://airlabs.co/api/v9/flights?api_key=YOUR_KEY`
- **Update Frequency**: Every 5 seconds (configurable in `useAircraftData`)
- **Data Format**: JSON array of aircraft objects
- **Coverage**: ~500+ active aircraft globally

### 2. **Data Fetching**: `aircraftService.ts`

**Function: `fetchAircraftData()`**
```typescript
// Fetches fresh aircraft data from AirLabs
// Returns: Aircraft[] | Mock data if API fails
// - Validates coordinates (lat/lng within valid ranges)
- Filters invalid entries
- Limits results to 500 for performance
- Falls back to mock data if API unavailable
```

**Error Handling**:
- Network errors → Fallback to mock data
- Missing API key → Uses mock data
- Invalid coordinates → Filters out corrupted entries

### 3. **Normalization**: Data Structure

**Raw AirLabs Response**:
```typescript
{
  hex: "a12345",           // Aircraft ICAO address
  lat: 51.5074,           // Latitude
  lng: -0.1278,           // Longitude
  alt: 35000,             // Altitude in feet
  dir: 270,               // Direction/heading in degrees
  speed: 450,             // Speed in knots
  flight_icao: "UAL123",  // Flight identifier
  aircraft_icao: "B777",  // Aircraft type
  airline_icao: "UAL",    // Airline identifier
  arr_icao: "KSFO",       // Destination airport
  dep_icao: "KORD"        // Departure airport
}
```

**Normalized `Aircraft` Type** (in `types/index.ts`):
```typescript
interface Aircraft {
  hex: string;            // Unique aircraft identifier
  flag?: string;          // Country flag
  lat: number;            // Latitude (-90 to 90)
  lng: number;            // Longitude (-180 to 180)
  alt: number;            // Altitude in feet
  dir: number;            // Heading in degrees (0-360)
  speed: number;          // Speed in knots
  v_speed?: number;       // Vertical speed
  flight_number?: string; // Human-readable flight number
  flight_icao?: string;   // ICAO flight identifier
  arr_iata?: string;      // Destination airport IATA
  arr_icao?: string;      // Destination airport ICAO
  dep_iata?: string;      // Departure airport IATA
  dep_icao?: string;      // Departure airport ICAO
  aircraft_icao?: string; // Aircraft type ICAO code
  airline_icao?: string;  // Airline ICAO code
  updated: number;        // Last update timestamp (Unix seconds)
}
```

### 4. **State Management**: `useAircraftData.ts`

**Hook Behavior**:
- **Polling Interval**: 5000ms (5 seconds) - configurable
- **State Variables**:
  - `aircraft[]` - Current array of aircraft
  - `isLoading` - Fetch in progress
  - `status` - API status ('idle' | 'ok' | 'error')
  - `lastFetchTime` - Last successful fetch timestamp
  - `error` - Error message if failed

**Lifecycle**:
1. Initial fetch on mount
2. Periodic polling every 5 seconds
3. Cleanup interval on unmount
4. Manual refresh available via `refresh()` callback

### 5. **Visualization**: App.tsx → MapContainer.tsx

**Flow**:
1. `App.tsx` receives `aircraft[]` from hook
2. Filters based on `viewMode` (all/aircraft/etc)
3. Calls `createOrUpdateMarker()` for each aircraft
4. Creates blue circular markers with aircraft icon
5. Attaches click handler to show details
6. Updates marker position on next poll cycle

**Marker Styling**:
- Color: Blue (#3B82F6)
- Radius: 8px base
- Hover: Scales up with rotation animation
- Label: Flight number (if available)

---

## 🛰️ Satellite & Debris Data Pipeline

### 1. **Data Source: CelesTrak TLE Feeds**
- **Endpoint**: `https://celestrak.org/NORAD/elements/gp.php?GROUP=XXX&FORMAT=TLE`
- **Available Groups**: 
  - `stations` - Space stations (ISS, Mir, etc.)
  - `starlink` - Starlink constellation
  - `active` - Active operational satellites
  - `cosmos-2251-debris` - Debris from COSMOS-2251 collision
- **Data Format**: Two-Line Element (TLE) Set - standard orbital format
- **Update Frequency**: TLE refresh every 6 hours + position update every 2 seconds

### 2. **TLE Format & Parsing**

**Standard TLE Format**:
```
ISS (ZARYA)
1 25544U 98067A   24337.51234567  .00016717  00000-0  29797-4 0  9005
2 25544  51.6422  339.8014 0006417  130.5349  220.2106 15.54283050437382
```

**Line 1 Structure** (Orbital Elements):
- Position 0-1: Line number (`1`)
- Position 2-7: Satellite number (NORAD ID)
- Position 8: Classification (`U` = Unclassified)
- Position 18-20: Epoch year
- Position 20-32: Epoch day of year (with decimal)
- Position 33-43: Drag term (first derivative of mean motion)

**Line 2 Structure** (Orbital Parameters):
- Position 0-1: Line number (`2`)
- Position 2-7: Satellite number
- Position 8-16: Inclination (degrees)
- Position 17-25: Right Ascension of Ascending Node (degrees)
- Position 26-33: Eccentricity (decimal fraction)
- Position 34-42: Argument of Perigee (degrees)
- Position 43-51: Mean Anomaly (degrees)
- Position 52-63: Mean Motion (revolutions per day)

**Parsing**: `tleParser.ts`
- `parseTLEText()` - Converts raw TLE text to structured TLEData objects
- `extractNoradId()` - Extracts satellite NORAD catalog number
- `extractEpoch()` - Determines TLE reference date/time
- `extractInclination()`, `extractMeanMotion()`, etc. - Individual element extraction
- `validateTLEChecksum()` - Validates TLE integrity

### 3. **Orbital Position Calculation**: `satelliteService.ts`

**Function: `calculateSatellitePosition(tle, date)`**

Uses **SGP4 Propagation Model** (via `satellite.js` library):

**Steps**:
1. **Initialize Satellite Record**
   ```typescript
   const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
   ```
   - Parses TLE into satellite orbital parameters
   - Validates TLE format and checksum

2. **Propagate to Current Time**
   ```typescript
   const positionAndVelocity = satellite.propagate(satrec, currentDate);
   ```
   - Uses SGP4 algorithm to calculate position at any date
   - SGP4 = Simplified General Perturbations (4th order)
   - Accounts for:
     - Earth's oblateness (J2 perturbation)
     - Atmospheric drag
     - Gravitational perturbations
   - Returns ECI (Earth-Centered Inertial) coordinates [x, y, z] in km

3. **Convert ECI → Geographic Coordinates**
   ```typescript
   const gmst = satellite.gstime(date);              // Greenwich Mean Sidereal Time
   const positionGd = satellite.eciToGeodetic(positionEci, gmst);
   ```
   - Converts from inertial frame to Earth-fixed frame
   - Applies GMST (Earth rotation) compensation
   - Returns geodetic coordinates:
     - `latitude` (radians) - (-π/2 to π/2)
     - `longitude` (radians) - (-π to π)
     - `height` (km) - Altitude above ellipsoid

4. **Validate & Convert to Degrees**
   ```typescript
   const latitude = satellite.degreesLat(positionGd.latitude);
   const longitude = satellite.degreesLong(positionGd.longitude);
   const altitude = positionGd.height; // Already in km
   ```
   - Validates latitude is within (-90, 90)°
   - Normalizes longitude to (-180, 180)°
   - Converts from radians to degrees

5. **Calculate Velocity**
   ```typescript
   const vel = positionAndVelocity.velocity; // [vx, vy, vz] in km/s
   const velocity = Math.sqrt(vel.x² + vel.y² + vel.z²);
   ```

6. **Extract Orbital Elements**
   ```typescript
   const inclination = (satrec.inclo * 180) / Math.PI; // Convert to degrees
   const period = (2π) / satrec.no; // Period in minutes
   ```

**Output**:
```typescript
{
  lat: number,           // Latitude in degrees
  lng: number,           // Longitude in degrees
  altitude: number,      // Altitude in kilometers
  velocity: number,      // Orbital velocity in km/s
  inclination: number,   // Orbit inclination in degrees
  period_minutes: number // Orbital period in minutes
}
```

### 4. **Categorization**: Satellite vs. Debris

**Function: `categorizeObject(name)`**

Uses keyword matching on satellite name:
```typescript
const debrisKeywords = ['DEB', 'DEBRIS', 'FRAG', 'R/B', 'ROCKET BODY', 'PAYLOAD'];

// If name contains debris keywords → object_type = 'debris'
// Otherwise → object_type = 'satellite'
```

**Debris Indicators**:
- `DEB` - Debris fragment
- `FRAG` - Fragment from collision or explosion
- `R/B` - Rocket body (spent launch stage)
- `ROCKET BODY` - Upper stage
- `PAYLOAD` - Non-functional payload

### 5. **Data Fetching**: `satelliteService.ts`

**Function: `fetchSatelliteData()`**

Fetches from multiple CelesTrak groups:
```typescript
const [stationsTLE, starlink30TLE, debrisTLE, activesTLE] = await Promise.all([
  fetchTLEFromCelesTrak('stations'),           // Space stations
  fetchTLEFromCelesTrak('starlink'),           // Limited Starlink sample
  fetchTLEFromCelesTrak('cosmos-2251-debris'), // Debris
  fetchTLEFromCelesTrak('active')              // Active satellites
]);

// Combine and limit: ~100 satellites, ~20 debris
const allTLEs = [
  ...stationsTLE,
  ...starlink30TLE.slice(0, 30),
  ...debrisTLE.slice(0, 20),
  ...activesTLE.slice(0, 50)
];
```

**For each TLE**:
1. Calculate position at current time
2. Determine if satellite or debris
3. Extract NORAD ID from TLE
4. Determine operator/owner from name
5. Assess visibility (altitude > 500km in sunlight)
6. Estimate collision risk (simplified heuristic)

**Returns**:
```typescript
{
  satellites: SatelliteObject[],  // Operational satellites
  debris: SatelliteObject[]       // Space debris objects
}
```

### 6. **Position Updates**: `useSatelliteData.ts`

**Two-Layer Update Strategy**:

**Layer 1: TLE Refresh** (Every 6 hours)
- Fetches fresh TLE data from CelesTrak
- Updates orbital parameters as orbits decay
- Calls `fetchSatelliteData()`

**Layer 2: Position Propagation** (Every 2 seconds)
- Uses existing TLE data
- Recalculates position for current time
- Calls `updateSatellitePositions(satellites, currentTime)`
- Much faster than re-fetching TLE data

**Why Two Layers?**
- TLE data only changes every 12-24 hours (orbit decay)
- Position changes continuously
- Position updates are fast (just math)
- TLE fetches are slow (network request)
- Balances accuracy with performance

### 7. **Normalized Data Type**: `SatelliteObject`

```typescript
interface SatelliteObject {
  norad_id: string;         // NORAD catalog number (from TLE)
  name: string;             // Satellite common name
  lat: number;              // Current latitude
  lng: number;              // Current longitude
  altitude: number;         // Altitude above Earth in km
  velocity: number;         // Orbital velocity in km/s
  inclination?: number;     // Orbit inclination in degrees
  period_minutes?: number;  // Orbital period in minutes
  operator?: string;        // Owner/operator organization
  object_type: 'satellite' | 'debris';
  visible: boolean;         // Is in sunlight (rough heuristic)
  epoch?: string;           // TLE epoch date
  conjunction_risk?: boolean; // Estimated collision risk
  tle?: TLEData;            // Original TLE data for re-propagation
}
```

### 8. **Visualization**: Green (Satellite) & Red (Debris)

**Marker Styling**:
- **Satellites**: Green (#10B981) circle, 8px radius
- **Debris**: Red (#EF4444) circle, 8px radius
- Hover: Scales up with rotation
- Click: Shows detailed information card

---

## 🎯 Data Flow to Hooks to Components

### Complete End-to-End Flow Diagram

```mermaid
sequenceDiagram
    participant API as External APIs
    participant Svc as Services Layer
    participant Hook as React Hooks
    participant App as App Component
    participant Comp as Components
    participant DOM as Browser DOM

    API->>Svc: AirLabs JSON Response
    Svc->>Svc: Validate & Normalize
    Svc->>Hook: Return Aircraft[]
    
    API->>Svc: CelesTrak TLE Text
    Svc->>Svc: Parse TLE<br/>Calculate Position (SGP4)
    Svc->>Svc: Categorize<br/>Extract Metadata
    Svc->>Hook: Return Satellites[],<br/>Debris[]
    
    Hook->>Hook: Store in State<br/>Set Loading/Status
    Hook->>App: Trigger Re-render
    
    App->>App: Read Hook State:<br/>aircraft[], satellites[], debris[]
    App->>App: Apply View Filter<br/>(viewMode)
    App->>App: For each object:<br/>createOrUpdateMarker()
    
    App->>Comp: Pass filtered objects<br/>to MapContainer
    Comp->>Comp: Create/Update markers<br/>on map instance
    Comp->>DOM: Add/Update SVG elements
    
    User->>DOM: Click marker
    DOM->>App: Trigger onClick handler
    App->>App: Set selectedObject state
    App->>Comp: Render ObjectDetailsCard
    Comp->>DOM: Show details modal

    Note over Svc,App: Periodic Updates (every 5-10 sec)
    Svc->>Svc: Fetch fresh data
    Hook->>Hook: Update state
    Hook->>App: Trigger re-render
    App->>Comp: Update marker positions
    Comp->>DOM: Animate to new positions
```

---

## 📊 Hook Usage & Data Passing

### `useAircraftData.ts`

**Purpose**: Manage aircraft data polling and state

**Returned State**:
```typescript
{
  aircraft: Aircraft[],              // Current aircraft array
  isLoading: boolean,                // Fetch in progress
  error: string | null,              // Error message
  lastFetchTime: Date | null,        // Last successful fetch
  status: 'idle' | 'ok' | 'error',  // API status indicator
  refresh: () => Promise<void>       // Manual refresh function
}
```

**Used In**: `App.tsx`
```typescript
const { aircraft, isLoading, status, refresh } = useAircraftData(5000);
// aircraft → filtered and rendered as blue markers
// status → displayed in StatsPanel
// refresh → called from manual refresh button
```

### `useSatelliteData.ts`

**Purpose**: Manage satellite/debris data fetching and position updates

**Returned State**:
```typescript
{
  satellites: SatelliteObject[],      // Current satellites
  debris: SatelliteObject[],          // Current debris objects
  isLoading: boolean,                 // Initial fetch in progress
  error: string | null,               // Error message
  lastFetchTime: Date,                // Last position update
  status: 'idle' | 'ok' | 'error',   // API status indicator
  refresh: () => Promise<void>        // Manual TLE refresh
}
```

**Used In**: `App.tsx`
```typescript
const { satellites, debris, status, refresh } = useSatelliteData(2000);
// satellites → filtered and rendered as green markers
// debris → filtered and rendered as red markers
// status → displayed in StatsPanel
// refresh → called from manual refresh button
```

### `useMapControls.ts`

**Purpose**: Manage view mode and object selection state

**Returned State**:
```typescript
{
  viewMode: 'all' | 'aircraft' | 'satellite' | 'debris',  // Filter mode
  selectedObject: SelectedObject | null,                    // Clicked object
  handleViewModeChange: (mode) => void,                     // Update mode
  handleObjectSelect: (object) => void,                     // Select object
  clearSelection: () => void                                // Clear selection
}
```

**Used In**: `App.tsx`
```typescript
const { viewMode, selectedObject, handleViewModeChange } = useMapControls();

// In rendering:
const filteredAircraft = viewMode === 'aircraft' || viewMode === 'all' ? aircraft : [];
const filteredSatellites = viewMode === 'satellite' || viewMode === 'all' ? satellites : [];
// etc.
```

### `useFPS.ts`

**Purpose**: Monitor rendering performance

**Returns**: `number` - Frames per second

**Used In**: `App.tsx`
```typescript
const fps = useFPS();
// Displayed in StatsPanel for performance monitoring
```

---

## 🔗 File Interconnections & Dependencies

### Services Layer Dependencies

```
api.ts (Configuration & Utilities)
  └─ Exports:
    - apiConfig (baseUrls, API keys)
    - fetchWithTimeout (network utility)

aircraftService.ts
  ├─ Imports: api.ts, types/index.ts
  ├─ Exports:
  │  ├─ fetchAircraftData() → Aircraft[]
  │  └─ getMockAircraftData() → Aircraft[]
  └─ Used By: useAircraftData.ts

satelliteService.ts
  ├─ Imports: api.ts, types/index.ts, satellite.js
  ├─ Exports:
  │  ├─ fetchSatelliteData() → {satellites: [], debris: []}
  │  ├─ calculateSatellitePosition() → {lat, lng, altitude, velocity, ...}
  │  ├─ updateSatellitePositions() → SatelliteObject[]
  │  ├─ categorizeObject() → 'satellite' | 'debris'
  │  ├─ getOperator() → string
  │  ├─ isInSunlight() → boolean
  │  └─ getMockSatelliteData() → {satellites: [], debris: []}
  └─ Used By: useSatelliteData.ts
```

### Hooks Layer Dependencies

```
useAircraftData.ts
  ├─ Imports: aircraftService.ts, types/index.ts
  ├─ Exports: useAircraftData hook
  └─ Used By: App.tsx

useSatelliteData.ts
  ├─ Imports: satelliteService.ts, types/index.ts
  ├─ Exports: useSatelliteData hook
  └─ Used By: App.tsx

useMapControls.ts
  ├─ Imports: types/index.ts
  ├─ Exports: useMapControls hook
  └─ Used By: App.tsx

useFPS.ts
  ├─ Imports: React
  ├─ Exports: useFPS hook
  └─ Used By: App.tsx
```

### Components Layer Dependencies

```
App.tsx (Main Orchestrator)
  ├─ Imports:
  │  ├─ All hooks (useAircraftData, useSatelliteData, useMapControls, useFPS)
  │  ├─ MapContainer component
  │  ├─ UI components (StatsPanel, ObjectDetailsCard, etc.)
  │  └─ types/index.ts
  ├─ Manages:
  │  ├─ All hook states
  │  ├─ Marker creation/updates
  │  ├─ View mode filtering
  │  └─ Selected object state
  └─ Renders:
     ├─ MapContainer
     ├─ UI overlay components
     └─ ObjectDetailsCard (conditional)

MapContainer.tsx
  ├─ Imports: @maptiler/sdk, types/index.ts
  ├─ Initializes: MapTiler instance
  ├─ Manages: Map state, projection toggle
  ├─ Receives: onMapLoad callback
  └─ Returns: Map instance to App.tsx

MapMarker.tsx
  ├─ Imports: @maptiler/sdk
  ├─ Creates: Individual maptiler.Marker instances
  └─ Receives: Marker data (position, color, etc.)

StatsPanel.tsx
  ├─ Receives:
  │  ├─ aircraftCount, satelliteCount, debrisCount
  │  ├─ status indicators
  │  ├─ fps value
  │  └─ onRefresh callback
  └─ Displays: Live statistics

ObjectDetailsCard.tsx
  ├─ Receives: selectedObject (Aircraft | SatelliteObject)
  ├─ Imports: tleParser utility functions
  ├─ Renders: Conditional details based on type
  └─ Used By: App.tsx (conditional rendering)

ViewModeToggle.tsx
  ├─ Receives: viewMode, handleViewModeChange
  ├─ Renders: Mode selector buttons
  └─ Used By: App.tsx

MapViewToggle.tsx
  ├─ Receives: isGlobeView, toggleGlobeView
  ├─ Renders: 2D/3D toggle button
  └─ Used By: App.tsx

Header.tsx, Footer.tsx
  ├─ Display: Static info
  └─ Used By: MainLayout.tsx

MainLayout.tsx
  ├─ Receives: Children components
  ├─ Renders: Layout wrapper
  └─ Used By: App.tsx
```

### Utils Layer

```
coordinates.ts
  ├─ Exports:
  │  ├─ calculateDistance() → number (km)
  │  ├─ toRadians() / toDegrees()
  │  ├─ isValidLatitude() / isValidLongitude()
  │  └─ normalizeLongitude()
  └─ Used By: aircraftService.ts, satelliteService.ts

formatting.ts
  ├─ Exports: Various formatting utilities
  └─ Used By: UI components

satelliteUtils.ts
  ├─ Imports: satellite.js, types/index.ts, coordinates.ts
  ├─ Exports:
  │  ├─ tleToGeoJSON() → GeoJSON.Feature
  │  └─ Other satellite utilities
  └─ Used By: satelliteService.ts, components

tleParser.ts
  ├─ Exports:
  │  ├─ parseTLEText() → TLEData[]
  │  ├─ extractNoradId() / extractEpoch() / etc.
  │  ├─ validateTLEChecksum()
  │  └─ calculateOrbitalPeriod()
  └─ Used By: satelliteService.ts, components
```

---

## 🔄 Execution Order & Data Flow Timeline

### Application Startup

```
1. main.tsx
   └─> React App mounts

2. App.tsx
   ├─> Initialize useAircraftData hook
   │   └─> Calls aircraftService.fetchAircraftData()
   │       └─> Makes AirLabs API request
   │           └─> Returns Aircraft[], starts 5-sec polling
   │
   ├─> Initialize useSatelliteData hook
   │   ├─> Calls satelliteService.fetchSatelliteData()
   │   │   └─> Fetches TLE from CelesTrak
   │   │       └─> For each TLE: calculateSatellitePosition()
   │   │           └─> SGP4 propagation → {lat, lng, alt, ...}
   │   │               └─> Returns Satellites[], Debris[]
   │   │                   └─> Starts 6-hour TLE refresh + 2-sec position updates
   │   │
   │   └─> updatePositions() callback
   │       └─> Recalculates positions every 2 seconds
   │
   ├─> Initialize useMapControls hook
   │   └─> Sets viewMode = 'all', selectedObject = null
   │
   ├─> Initialize useFPS hook
   │   └─> Starts FPS counter
   │
   ├─> Initialize MapContainer
   │   └─> Initializes MapTiler instance
   │       └─> Loads satellite imagery
   │           └─> onMapLoad callback → App gets map reference
   │
   └─> First render with empty/loading states
       └─> "Loading..." messages shown

3. Data Arrives
   ├─> Aircraft data arrives
   │   └─> useAircraftData updates state
   │       └─> App re-renders
   │           └─> Creates blue markers
   │
   └─> Satellite data arrives
       └─> useSatelliteData updates state
           └─> App re-renders
               └─> Creates green (satellite) & red (debris) markers
```

### Continuous Updates

```
Every 5 seconds:
  aircraftService.fetchAircraftData()
  → useAircraftData state update
  → App re-renders
  → Marker positions animate

Every 2 seconds:
  satelliteService.updateSatellitePositions()
  → useSatelliteData state update
  → App re-renders
  → Marker positions animate

Every 6 hours:
  satelliteService.fetchSatelliteData()
  → Updates TLE data
  → Recalculates all positions
  → useSatelliteData state update
```

### User Interactions

```
1. Click Marker
   └─> App.createOrUpdateMarker() click handler
       └─> App.handleObjectSelect(objectData)
           └─> useMapControls.handleObjectSelect()
               └─> selectedObject state updated
                   └─> App renders ObjectDetailsCard

2. Toggle View Mode
   └─> ViewModeToggle onClick
       └─> handleViewModeChange(mode)
           └─> useMapControls updates viewMode
               └─> App re-filters objects
                   └─> Only matching markers visible

3. Toggle Globe/Map View
   └─> MapViewToggle onClick
       └─> App.toggleGlobeView()
           └─> mapRef.setProjection('globe' | 'mercator')
               └─> Map transitions to new projection

4. Manual Refresh
   └─> StatsPanel refresh button
       └─> App.handleRefresh()
           └─> refreshAircraft() + refreshSatellites()
               └─> Immediate data fetch
                   └─> State updates, markers refresh
```

---

## 📝 Summary Table: File Responsibilities

| File | Location | Responsibility |
|------|----------|-----------------|
| `api.ts` | `services/` | API configuration, fetch timeout wrapper |
| `aircraftService.ts` | `services/` | Fetch aircraft, validate, return normalized data |
| `satelliteService.ts` | `services/` | Fetch TLE, parse, calculate positions (SGP4), categorize, return objects |
| `useAircraftData.ts` | `hooks/` | Poll aircraft data every 5s, manage state, expose via hook |
| `useSatelliteData.ts` | `hooks/` | Poll positions every 2s, refresh TLE every 6h, manage state, expose via hook |
| `useMapControls.ts` | `hooks/` | Manage view mode and object selection |
| `useFPS.ts` | `hooks/` | Monitor and expose FPS metric |
| `App.tsx` | `src/` | Orchestrate all hooks, filter by view mode, create/update markers |
| `MapContainer.tsx` | `components/Map/` | Initialize MapTiler, handle projection, expose map instance |
| `MapMarker.tsx` | `components/Map/` | Create individual maptiler.Marker instances |
| `StatsPanel.tsx` | `components/UI/` | Display live counts, status, FPS, refresh button |
| `ObjectDetailsCard.tsx` | `components/UI/` | Display detailed info for selected object |
| `ViewModeToggle.tsx` | `components/UI/` | View mode selector (All/Aircraft/Satellite/Debris) |
| `MapViewToggle.tsx` | `components/UI/` | 2D Map / 3D Globe toggle |
| `Header.tsx` | `components/UI/` | App title and branding |
| `Footer.tsx` | `components/UI/` | Footer info and links |
| `MainLayout.tsx` | `components/Layout/` | Layout wrapper for components |
| `types/index.ts` | `types/` | TypeScript interfaces and type definitions |
| `coordinates.ts` | `utils/` | Distance, coordinate validation/conversion utilities |
| `formatting.ts` | `utils/` | Data formatting helpers |
| `satelliteUtils.ts` | `utils/` | Satellite-specific utilities (GeoJSON conversion, etc.) |
| `tleParser.ts` | `utils/` | TLE parsing and orbital element extraction |

---

## 🚀 Usage

1. **View Modes**: Use the top-right toggle to switch between:
   - **All objects** (combined view)
   - **Aircraft only** (blue markers)
   - **Satellites only** (green markers)
   - **Space debris only** (red markers)

2. **Globe / Map Toggle**: Use the view toggle to switch between:
   - **2D Map** (flat Web Mercator projection)
   - **3D Globe** (realistic Earth sphere visualization)

3. **Object Details**: Click any marker to view detailed information
   - Aircraft: Flight number, altitude, speed, route, etc.
   - Satellite: Orbital elements, operator, altitude, velocity, etc.
   - Debris: Object details and conjunction risk assessment

4. **Stats Panel**: View real-time counts in the top-left panel
   - Live counts of objects
   - API status indicators
   - FPS performance metric
   - Last update timestamp
   - Manual refresh button

5. **Tooltips**: Hover over markers to see object names and key info

---

## 🎯 New Features

### ✅ **1. Flight Replay - Time Travel for Flights** 🔄
**What it does:** Records the last 24 hours of every aircraft's position and allows you to replay the flight like watching a video.

**Key Features:**
- 24-hour position history recording
- Interactive timeline slider
- Speed controls (1x, 2x, 4x, 8x)
- Smooth position interpolation
- Visual replay marker with heading indicator
- Flight path visualization

**How to use:**
1. Click on any aircraft marker
2. Wait 1-2 minutes for history to accumulate
3. Click "🔄 Replay Flight" button
4. Use slider to scrub through timeline
5. Adjust playback speed as needed

**User Benefits:**
- ✅ Investigate flight delays and diversions
- ✅ Analyze approach and landing patterns
- ✅ Educational tool for aviation students
- ✅ Understand weather-related route changes

---

### ✅ **2. Airport Live Board - Real-Time Airport Dashboard** ✈️
**What it does:** Shows a complete real-time dashboard of any airport in the world with arrivals, departures, delays, and gate information.

**Key Features:**
- Real-time flight schedules
- Three-tab interface (Arrivals, Departures, Delayed)
- Live status updates (On Time, Delayed, Landed, Cancelled)
- Gate information
- Delay duration tracking
- Airport statistics dashboard
- Auto-refresh every minute

**Information Displayed:**
- Flight numbers and airline codes
- Origin/Destination airports
- Scheduled vs actual times
- Current status with color coding
- Gate and terminal numbers
- Aircraft types
- Real-time delay metrics

**How to use:**
1. Click "✈️ Airport Board" button
2. View default airport (JFK) or change code
3. Switch between Arrivals/Departures/Delayed tabs
4. Click on any flight for details

**User Benefits:**
- ✅ Track loved ones' flights
- ✅ Plan airport pickups with accurate timing
- ✅ Monitor airport congestion
- ✅ Identify delay patterns

---

### ✅ **3. Nearby Flights Around You - Personal Air Traffic Control** 📍
**What it does:** Uses your GPS location to show all flights within a customizable radius (100-1000 km).

**Key Features:**
- Geolocation-based flight search
- Adjustable search radius
- Three highlighted categories:
  - **Closest Flight:** Nearest aircraft to you
  - **Fastest Flight:** Fastest aircraft nearby
  - **Lowest Flight:** Lowest altitude aircraft
- Distance and bearing calculations
- Compass direction indicators
- Click to select and track flights

**Information Displayed:**
- Flight identification
- Distance from your location (km)
- Cardinal direction (N, NE, E, etc.)
- Altitude in feet
- Speed in knots
- Aircraft type and airline

**How to use:**
1. Click "📍 Nearby Flights" button
2. Allow browser location permission
3. Select search radius (100-1000 km)
4. View nearby flights sorted by distance
5. Click any flight to track on map

**User Benefits:**
- ✅ Identify planes overhead
- ✅ Plane spotting and aviation enthusiasm
- ✅ Monitor local air traffic
- ✅ Educational for children and students

---

### ✅ **4. Aircraft Performance Dashboard - Flight Health Monitor** 📊
**What it does:** Tracks and visualizes aircraft performance metrics in real-time with interactive charts.

**Key Features:**
- Real-time data recording
- Interactive line charts
- Speed over time visualization
- Altitude curve tracking
- Climb/descent rate analysis
- Statistical calculations (avg, max, min)
- Performance metrics grid

**Metrics Tracked:**
- Average speed (knots)
- Maximum speed achieved
- Average altitude (feet)
- Maximum altitude reached
- Average climb rate (ft/min)
- Average descent rate (ft/min)
- Data point tracking (up to 200 points)

**How to use:**
1. Select any aircraft on the map
2. Click "📊 Performance" button
3. View real-time charts and statistics
4. Monitor performance changes over time

**User Benefits:**
- ✅ Understand aircraft behavior
- ✅ Educational tool for aviation students
- ✅ Detect unusual flight patterns
- ✅ Analyze fuel efficiency

---

### ✅ **5. Enhanced Satellite Tracker - Space Observer** 🛰️
**What it does:** Provides detailed satellite information including orbital trails, ground coverage, and technical specifications.

**Key Features:**
- Three-tab interface (Info, Trail, Footprint)
- Orbital trail visualization (last 90 minutes)
- Ground footprint calculations
- Coverage area analysis
- Collision risk warnings
- Operator information
- Visibility status

**Info Tab:**
- Satellite operator (SpaceX, NASA, etc.)
- Object type (Satellite/Debris)
- Orbital period
- Ground visibility status
- Collision risk alerts
- Technical specifications

**Trail Tab:**
- Last 90 minutes of orbital positions
- Trail rendered as dashed line on map
- 30-second position intervals
- Trail statistics

**Footprint Tab:**
- Coverage radius (km)
- Total coverage area (km²)
- Center position coordinates
- Ground visibility explanation

**How to use:**
1. Select any satellite on the map
2. Click "🛰️ Sat Tracker" button
3. Switch between Info/Trail/Footprint tabs
4. View detailed satellite information

**User Benefits:**
- ✅ Track International Space Station (ISS)
- ✅ Monitor Starlink satellites
- ✅ Understand satellite coverage
- ✅ Space debris awareness

---

### ✅ **6. Orbit Visualizer - Future Path Predictor** 🪐
**What it does:** Predicts and visualizes satellite future positions (30-180 minutes) with orbital path rendering.

**Key Features:**
- Orbital path prediction
- Adjustable duration (30-180 minutes)
- SGP4 propagation algorithm
- Orbit type classification (LEO/MEO/GEO/HEO)
- Next pass predictions
- Visual path rendering on map
- Green dashed line visualization

**Orbit Types Explained:**
- **LEO (160-2,000 km):** ISS, Starlink, imaging satellites
- **MEO (2,000-35,786 km):** GPS satellites
- **GEO (~35,786 km):** TV/Weather satellites
- **HEO (>35,786 km):** Research satellites

**Next Pass Information:**
- AOS (Acquisition of Signal): Rise time
- LOS (Loss of Signal): Set time
- Max Elevation: Highest angle in sky

**How to use:**
1. Select any satellite on the map
2. Click "🪐 Orbit" button
3. Choose prediction duration
4. View predicted path on map
5. Check next pass timing

**User Benefits:**
- ✅ Plan satellite observations
- ✅ Amateur radio communications
- ✅ Astrophotography timing
- ✅ Space science education

---

## 📊 Feature Comparison Table

| Feature | Data Source | Update Rate | Primary Use | Best For |
|---------|------------|-------------|-------------|----------|
| **Flight Replay** | Recorded positions | Last 24 hours | Historical analysis | Delay investigation, route analysis |
| **Airport Board** | AirLabs API | Real-time | Airport monitoring | Travel planning, pickups |
| **Nearby Flights** | AirLabs + Geolocation | Real-time | Local awareness | Plane spotting, curiosity |
| **Performance Dashboard** | Live tracking | Continuous | Metrics analysis | Aviation students, enthusiasts |
| **Satellite Tracker** | CelesTrak TLE | Real-time | Satellite info | Space enthusiasts |
| **Orbit Visualizer** | SGP4 Propagation | Predictive | Path planning | Astrophotography, observations |

---

## 🎯 User Personas & Benefits

### 🔵 Aviation Enthusiast
**Uses:** Nearby Flights, Flight Replay, Performance Dashboard  
**Benefits:** Identify overhead planes, track flights, learn aircraft behavior

### 🟢 Frequent Traveler
**Uses:** Airport Board, Flight Replay  
**Benefits:** Track flight status, plan arrivals, understand delays

### 🟡 Aviation Student
**Uses:** Performance Dashboard, Flight Replay  
**Benefits:** Study flight patterns, analyze procedures, learn metrics

### 🟣 Space Enthusiast
**Uses:** Satellite Tracker, Orbit Visualizer  
**Benefits:** Track ISS, understand orbits, plan satellite viewing

### 🔴 Family Member
**Uses:** Airport Board, Nearby Flights  
**Benefits:** Real-time pickups, delay notifications

---

## 🎮 Usage Guide

### Basic Navigation
1. **View Modes**: Toggle between All/Aircraft/Satellite/Debris
2. **Globe/Map**: Switch between 2D flat map and 3D globe
3. **Click Markers**: Select any object for detailed information
4. **Stats Panel**: View live counts and system status

### Feature Access
1. **Flight Replay**: Select aircraft → "🔄 Replay Flight"
2. **Airport Board**: Click "✈️ Airport Board" button
3. **Nearby Flights**: Click "📍 Nearby Flights" → Allow location
4. **Performance**: Select aircraft → "📊 Performance"
5. **Satellite Tracker**: Select satellite → "🛰️ Sat Tracker"
6. **Orbit Visualizer**: Select satellite → "🪐 Orbit"

---

## 🔧 Data Sources & Design Decisions

### ✈️ Aircraft Data — *AirLabs API*
**Why AirLabs:**
- Free tier available (1000 requests/day)
- Simple REST endpoints  
- Good global coverage (~500 aircraft visible)
- No backend proxying required

**Tradeoffs:**
- Fewer metadata fields than premium services
- Lower refresh frequency
- Occasional rate limits in free tier

---

### 🛰️ Satellite & Debris Data — *CelesTrak (TLE)*
**Why CelesTrak:**
- Free and unlimited access
- Reliable TLE datasets
- Perfect for orbital propagation  
- Works well for educational/POC scale

**Tradeoffs:**
- TLEs updated every ~12-24 hours  
- Lower real-time accuracy vs paid services
- No advanced collision warnings

---

## 📈 Performance Metrics

- **Refresh Rates:**
  - Aircraft: Every 5 seconds
  - Satellite positions: Every 2 seconds
  - TLE data: Every 6 hours
  - Airport schedules: Every 60 seconds

- **Data Limits:**
  - Flight history: 24 hours per aircraft
  - Performance data: 200 points per aircraft
  - Nearby flights: 20 displayed results
  - Orbital predictions: Up to 180 minutes

---

## 🐛 Troubleshooting

### Flight Replay Not Working
**Issue:** "Not enough history data"  
**Solution:** Wait 1-2 minutes after selecting aircraft for positions to record

### Geolocation Not Working
**Issue:** "Location unavailable"  
**Solution:** 
- Enable HTTPS (required for geolocation)
- Allow browser location permission
- Check device location services

### Performance Dashboard Empty
**Issue:** No data showing  
**Solution:** Select aircraft and wait a few seconds for data collection

### Satellite Trail Not Visible
**Issue:** Trail not rendering on map  
**Solution:** 
- Ensure satellite has TLE data
- Check map zoom level (zoom in if needed)
- Toggle Satellite Tracker off and on

---

## 📁 Project Structure with New Feature
```
src/
├── components/
│   ├── Airport/
│   │   └── AirportLiveBoard.tsx          # Airport dashboard
│   ├── FlightReplay/
│   │   └── FlightReplayControl.tsx       # Flight replay UI
│   ├── Nearby/
│   │   └── NearbyFlightsPanel.tsx        # Nearby flights panel
│   ├── Performance/
│   │   └── PerformanceDashboard.tsx      # Performance charts
│   ├── Satellite/
│   │   └── SatelliteEnhancedPanel.tsx    # Satellite details
│   ├── Orbit/
│   │   └── OrbitVisualizerPanel.tsx      # Orbit predictions
│   ├── Map/
│   │   ├── MapContainer.tsx              # Map integration
│   │   └── MapMarker.tsx                 # Marker rendering
│   ├── Layout/
│   │   └── MainLayout.tsx                # App layout
│   └── UI/
│       ├── StatsPanel.tsx                # Statistics
│       ├── ObjectDetailsCard.tsx         # Object info
│       ├── ViewModeToggle.tsx            # View selector
│       └── MapViewToggle.tsx             # 2D/3D toggle
├── services/
│   ├── api.ts                            # API config
│   ├── aircraftService.ts                # Aircraft data
│   ├── satelliteService.ts               # Satellite data
│   ├── airportService.ts                 # Airport data
│   ├── flightHistoryService.ts           # History recording
│   ├── nearbyFlightsService.ts           # Nearby search
│   └── satelliteEnhancedService.ts       # Satellite features
├── hooks/
│   ├── useAircraftData.ts                # Aircraft hook
│   ├── useSatelliteData.ts               # Satellite hook
│   ├── useFlightHistory.ts               # History hook
│   ├── useNearbyFlights.ts               # Nearby hook
│   ├── useAirportData.ts                 # Airport hook
│   ├── useAircraftPerformance.ts         # Performance hook
│   └── useSatelliteEnhanced.ts           # Satellite hook
├── types/
│   └── index.ts                          # TypeScript types
├── utils/
│   ├── coordinates.ts                    # Coordinate utils
│   ├── formatting.ts                     # Formatting utils
│   └── tleParser.ts                      # TLE parsing
└── App.tsx                               # Main app
```

---

## 📞 Support

- **Issues:** Open GitHub issue
- **Discussions:** GitHub Discussions
- **Email:** your-email@example.com

---

## 🎯 Roadmap

### Planned Features
- [ ] Weather layer integration
- [ ] Historical flight data export
- [ ] Custom alert notifications
- [ ] Multi-language support
- [ ] Mobile app version
- [ ] Premium API integrations
- [ ] Advanced analytics dashboard
- [ ] User accounts and favorites

---

## 📊 Statistics

- **Total Features:** 6+ advanced features
- **Data Sources:** 2 primary APIs
- **Update Frequency:** Real-time (2-5 second intervals)
- **Coverage:** Global (500+ aircraft, 150+ satellites)
- **Technologies:** 10+ modern libraries
- **Lines of Code:** 4000+

---
