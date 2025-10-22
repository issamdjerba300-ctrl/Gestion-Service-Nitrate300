# Authentication System - SQLite with JWT

This application uses a local SQLite database for authentication with bcrypt password hashing and JWT tokens.

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

Dependencies installed:
- `better-sqlite3` - SQLite database
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation

### 2. Initialize Database

The database is automatically initialized when the server starts. It creates an `app.db` file in the `backend/db/` directory.

To manually initialize:
```bash
node db/init-db.js
```

### 3. Start the Backend Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server runs on `http://localhost:5000`

## API Endpoints

### Authentication Endpoints

#### 1. Register User
```bash
POST /auth/register
Content-Type: application/json

{
  "username": "youruser",
  "password": "yourpassword"
}
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "youruser"
  }
}
```

#### 2. Login
```bash
POST /auth/login
Content-Type: application/json

{
  "username": "youruser",
  "password": "yourpassword"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "youruser",
    "created_at": "2025-10-18T06:00:00.000Z"
  }
}
```

#### 3. Change Password (Protected)
```bash
POST /auth/change-password
Content-Type: application/json
Authorization: Bearer <your_jwt_token>

{
  "oldPassword": "currentpassword",
  "newPassword": "newpassword"
}
```

Response:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### 4. Get Current User (Protected)
```bash
GET /auth/me
Authorization: Bearer <your_jwt_token>
```

Response:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "youruser",
    "created_at": "2025-10-18T06:00:00.000Z"
  }
}
```

## Testing with curl

### Register a new user:
```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

### Login:
```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

### Get current user:
```bash
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Change password:
```bash
curl -X POST http://localhost:5000/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"oldPassword":"testpass123","newPassword":"newpass456"}'
```

## Database Schema

### Users Table
```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

1. **Password Hashing**: Passwords are hashed using bcrypt with 12 salt rounds
2. **JWT Tokens**: Secure token-based authentication with 7-day expiry
3. **Input Validation**: Username and password requirements enforced
4. **Protected Routes**: Middleware authentication for sensitive endpoints
5. **Error Handling**: Secure error messages without exposing sensitive data

## Password Requirements

- Minimum 8 characters
- Username must be at least 3 characters

## Frontend Integration

The frontend uses the authentication context (`AuthContext`) which:
- Stores JWT token in localStorage
- Automatically includes token in protected requests
- Provides signIn, signUp, signOut, and changePassword methods

## Environment Variables

You can customize the JWT secret by setting:
```bash
JWT_SECRET=your-secure-secret-key
```

Default: `your-secure-secret-key-change-in-production`

**IMPORTANT**: Change this in production!

## Database Location

The SQLite database is stored at:
```
backend/db/app.db
```

## Migration from Supabase

If you have existing users in Supabase:

1. Export user data from Supabase
2. For each user, you'll need to:
   - Create a new account with the username
   - Force password reset (since you can't migrate hashed passwords from Supabase)
3. Or manually insert users into the SQLite database with new passwords

Note: Password hashes from Supabase cannot be directly migrated as they use a different hashing algorithm.
