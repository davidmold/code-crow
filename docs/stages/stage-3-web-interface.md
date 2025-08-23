# Stage 3: Basic Web Interface

## Goal
Create a working Vue3 frontend and Express API server. At the end of this stage, you should have a web interface that can display projects and send basic API requests (no Claude Code integration yet).

## Prerequisites
- Stage 2 completed (Claude Code integration working)
- Basic understanding of Vue3 and Express

## Tasks

### 1. Enhance Server Package
Upgrade packages/server to include:
- Express REST API with proper routing
- CORS middleware for local development
- Basic endpoints for projects and health checks
- Request/response logging
- Error handling middleware

### 2. Create API Endpoints
Implement these initial REST endpoints:
- `GET /api/health` - Server health check
- `GET /api/projects` - List available projects (mock data for now)
- `GET /api/projects/:id/files` - List files in a project (mock data)
- `POST /api/test` - Echo endpoint for testing

### 3. Enhance Vue3 Frontend
Build out packages/web with:
- Proper Vue3 setup with Composition API
- Vue Router for navigation
- Pinia store for state management
- Axios for API requests
- Basic responsive layout with Tailwind CSS

### 4. Create Core Components
Build these Vue components:
- `ProjectList.vue` - Display list of projects
- `FileExplorer.vue` - Browse project files
- `ChatInterface.vue` - Text input and response area (no functionality yet)
- `Layout.vue` - Main application layout

### 5. Create Views/Pages
Implement these main views:
- `HomeView.vue` - Landing page with project selection
- `ProjectView.vue` - Project workspace with file explorer and chat
- `SettingsView.vue` - Configuration and preferences

### 6. State Management
Set up Pinia stores for:
- `projectStore.ts` - Project data and selection
- `uiStore.ts` - UI state (loading, errors, etc.)
- `settingsStore.ts` - User preferences

### 7. API Integration
Connect frontend to backend:
- Service layer for API calls
- Error handling for failed requests
- Loading states and user feedback
- Mock data integration

## Success Criteria
- [ ] Web interface loads and displays properly
- [ ] Can navigate between different views
- [ ] API endpoints respond correctly
- [ ] Frontend can fetch and display project list
- [ ] File explorer shows project structure (mock data)
- [ ] Responsive design works on different screen sizes
- [ ] No console errors or warnings

## Files to Create

### Server
- packages/server/src/routes/projects.ts
- packages/server/src/routes/health.ts
- packages/server/src/middleware/cors.ts
- packages/server/src/middleware/errorHandler.ts
- packages/server/src/services/projectService.ts (mock data)

### Web
- packages/web/src/components/ProjectList.vue
- packages/web/src/components/FileExplorer.vue  
- packages/web/src/components/ChatInterface.vue
- packages/web/src/components/Layout.vue
- packages/web/src/views/HomeView.vue
- packages/web/src/views/ProjectView.vue
- packages/web/src/stores/projectStore.ts
- packages/web/src/stores/uiStore.ts
- packages/web/src/services/api.ts

## Development Scripts
Update root package.json with:
```bash
npm run dev:web     # Start Vue3 dev server
npm run dev:server  # Start Express server
npm run dev         # Start both web and server
```

## Testing
- Web interface accessible at http://localhost:3000
- API accessible at http://localhost:8080
- Projects endpoint returns mock data
- File explorer displays hierarchical data
- Navigation between views works

## Claude Code Command
```
Create a Vue3 frontend with project browsing and chat interface, plus an Express API server with project endpoints. Use mock data for now. Set up proper routing, state management, and API integration.
```

## Next Stage
Once the web interface is working with mock data, move to Stage 4 to add WebSocket communication between all components.
