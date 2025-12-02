# 🛩️ Real-Time Flight & Satellite Tracker

A high-performance real-time tracking system that visualizes live aircraft positions and LEO satellites/debris on an interactive map.

## 🚀 Features

- **Live Aircraft Tracking**: Real-time flight data from AirLabs API
- **Satellite Visualization**: LEO satellites and space debris tracking
- **Interactive Map**: MapTiler SDK with hybrid satellite/street view
- **Multi-View Modes**: Toggle between aircraft, satellites, debris, or all
- **Detailed Information**: Click any marker for comprehensive details
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Auto-refresh every 10 seconds

## 📦 Installation
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
VITE_LEOLABS_API_KEY=your_leolabs_key
```

### Get API Keys:
- **MapTiler**: https://www.maptiler.com/ (Free tier available)
- **AirLabs**: https://airlabs.co/ (Free tier: 50 requests/hour)
- **LEOLabs**: https://leolabs.space/ (Contact for API access)

## 🏃 Running the Project
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure
```
src/
├── components/
│   ├── Map/              # Map components
│   ├── UI/               # UI components (Header, Footer, Cards)
│   └── Layout/           # Layout components
├── services/             # API services
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
└── App.tsx               # Main application component
```

## 🛠️ Tech Stack

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **MapTiler SDK** - Map visualization
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

## 🎯 Usage

1. **View Modes**: Use the top-right toggle to switch between:
   - All objects (combined view)
   - Aircraft only
   - Satellites only
   - Space debris only

2. **Object Details**: Click any marker to view detailed information

3. **Stats Panel**: View real-time counts in the top-left panel

## 📊 Data Sources

- **Aircraft**: AirLabs API (live flight data)
- **Satellites**: LEOLabs API (orbital data)
- **Mock Data**: Fallback data for development

## 🔄 Update Frequency

- Aircraft data: Every 10 seconds
- Satellite data: Every 10 seconds
- Map markers: Real-time rendering

## 🚧 Future Enhancements

- [ ] WebSocket connections for real-time updates
- [ ] Flight path history trails
- [ ] Orbital prediction visualization
- [ ] Advanced filtering options
- [ ] 3D visualization with Three.js
- [ ] Export data functionality
- [ ] Collision risk alerts

