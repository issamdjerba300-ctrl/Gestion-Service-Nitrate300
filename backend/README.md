# Maintenance Works Backend

## Setup Instructions

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

4. **Server will run on:**
   - URL: http://localhost:5000
   - Endpoints:
     - GET /works - Retrieve all maintenance works
     - POST /works - Save maintenance works data

## Data Storage

- Data is stored in `data.json` file
- Server automatically creates/repairs the file if missing or corrupted
- Data format: `{ "date": [workItems], "date2": [workItems], ... }`

## Development

- Server automatically handles CORS for frontend development
- JSON data is pretty-printed for easy inspection
- Error handling ensures server stays stable even with corrupted data