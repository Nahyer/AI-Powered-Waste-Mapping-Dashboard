# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# AI-Powered Waste Mapping Dashboard - Frontend

A modern, interactive React-based dashboard for visualizing and managing waste hotspots with real-time mapping capabilities.

## 🚀 Features

### Map & Heatmap Visualization
- **Interactive Leaflet Map**: Zoom, pan, and explore waste hotspots
- **Dual View Modes**: Switch between detailed markers and heatmap visualization
- **Color-coded Severity**: Visual indicators based on waste severity levels (1-10)
- **Real-time Updates**: Live data synchronization with backend services

### Manual Hotspot Submission
- **Click-to-Add**: Click anywhere on the map to report new waste locations
- **Comprehensive Form**: Detailed submission form with validation
- **Multiple Waste Types**: Support for various waste categories
- **Visual Severity Slider**: Interactive severity selection with color feedback
- **Form Validation**: Client-side validation with helpful error messages

### Enhanced UI/UX
- **Modern Design**: Clean, responsive interface using Tailwind CSS
- **Toast Notifications**: Real-time feedback for user actions
- **Loading States**: Smooth loading animations and states
- **Accessibility**: Keyboard navigation and screen reader support
- **Mobile Responsive**: Optimized for desktop, tablet, and mobile devices

### Dashboard Features
- **Real-time Statistics**: Live stats cards showing hotspot metrics
- **Filterable Lists**: Recent hotspots with clickable selection
- **Interactive Elements**: Hover effects, transitions, and animations
- **Status Indicators**: Visual feedback for different states

## 🛠️ Technology Stack

- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Leaflet & React-Leaflet** - Interactive mapping library
- **ESLint** - Code quality and consistency

## 🏗️ Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx          # Main dashboard container
│   ├── MapComponent.tsx       # Interactive map with hotspots
│   ├── HotspotSubmissionForm.tsx # Manual hotspot reporting form
│   ├── ToastContainer.tsx     # Notification system
│   ├── LoadingSpinner.tsx     # Loading states
│   └── StatsCard.tsx          # Statistics display cards
├── types/
│   └── index.ts               # TypeScript type definitions
├── App.tsx                    # Root application component
├── App.css                    # Application styles
├── index.css                  # Global styles
└── main.tsx                   # Application entry point
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- pnpm (recommended) or npm

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm run dev
```

3. Open your browser to `http://localhost:5173`

### Build for Production

```bash
pnpm run build
```

## 🎨 UI/UX Features

### Color-Coded Severity System
- 🟢 **Low (1-3)**: Green indicators
- 🟡 **Low-Medium (4-5)**: Yellow indicators  
- 🟠 **Medium (6-7)**: Orange indicators
- 🔴 **High (8-10)**: Red indicators

### Interactive Map Features
- **Markers Mode**: Individual clickable markers with popups
- **Heatmap Mode**: Circular overlays showing severity intensity
- **Adding Mode**: Click-to-add new hotspots directly on map
- **Responsive Design**: Optimized for all screen sizes

### Form Validation
- Required field validation
- Email format validation
- Coordinate range validation (lat/lng)
- Real-time error feedback
- Visual form state indicators

### Accessibility Features
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast color combinations
- Focus management

## 📱 Responsive Design

The dashboard is fully responsive and optimized for:
- **Desktop**: Full feature set with sidebar layout
- **Tablet**: Adapted grid layouts and touch-friendly controls
- **Mobile**: Stacked layout with mobile-optimized interactions

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_MAP_DEFAULT_CENTER_LAT=37.7749
VITE_MAP_DEFAULT_CENTER_LNG=-122.4194
VITE_MAP_DEFAULT_ZOOM=13
```

### Data Sources
The application supports loading hotspot data from:
- Static JSON files (`/public/data/hotspots.json`)
- REST API endpoints (configurable)
- Real-time WebSocket connections (future enhancement)

## 🎯 Usage

1. **View Hotspots**: The map loads with existing waste hotspots
2. **Switch Views**: Toggle between marker and heatmap visualization
3. **Add Hotspots**: 
   - Click "Add Hotspot" button
   - Click anywhere on the map
   - Fill out the submission form
   - Submit to add the new hotspot
4. **Explore Data**: Click on hotspots or list items for details
5. **Monitor Stats**: View real-time statistics in the header cards

## 🐛 Known Issues

- Map tiles may load slowly on slower connections
- Form submission currently saves locally (backend integration pending)
- Hotspot data persists only in browser session

## 🔮 Future Enhancements

- Real-time data synchronization
- Hotspot clustering for better performance
- Advanced filtering and search
- Export functionality (PDF, CSV)
- Offline mode support
- Push notifications for new hotspots
- Integration with cleanup scheduling
- Photo upload for hotspot documentation

## 📄 License

This project is part of the AI-Powered Waste Mapping Dashboard system.

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
