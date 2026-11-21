# Backend Tutorial

This guide explains how to run the new backend server and connect it to your frontend.

## 1. Prerequisites

Make sure you have Node.js installed. You've already installed the necessary dependencies during the setup.

## 2. Project Structure

- **server/**: Contains the backend code.
  - **src/routes/**: API route definitions.
  - **prisma/**: Database schema and seed script.
  - **.env**: Configuration file where you put your database connection.

## 3. Running the Backend

1. **Configure Database**:
   - Create a file named `.env` in the `server` folder.
   - Copy the content from `.env.example`.
   - **CRITICAL**: Update `DATABASE_URL` with your PostgreSQL credentials.
     ```
     postgresql://USER:PASSWORD@localhost:5432/dicionario_gamer
     ```
     Replace `USER` and `PASSWORD` with your Postgres username and password.

2. **Setup Database**:
   Open a terminal in `server/` and run:
   ```bash
   npx prisma migrate dev --name init
   ```
   This will create the tables in your PostgreSQL database.

3. **Seed Data**:
   ```bash
   npx ts-node prisma/seed.ts
   ```

4. **Start Server**:
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:3001`.

## 4. API Endpoints

The following endpoints are available:

- **Auth**:
  - `POST /auth/login`: Login with email/password. (Default admin: `admin@dicionariogamer.com` / `admin`)
  - `POST /auth/register`: Create a new account.

- **Games**:
  - `GET /games`: List all games.
  - `GET /games/:slug`: Get game details.

- **Terms**:
  - `GET /terms`: List all terms (supports `?gameId=...`).
  - `GET /terms/:id`: Get term details.
  - `POST /terms`: Create a new term (contribution).
  - `POST /terms/:id/vote`: Upvote/downvote.

- **News**:
  - `GET /news`: List news.
  - `POST /news`: Create news.

- **Dashboard**:
  - `GET /dashboard/stats`: Get overview statistics.

## 5. Connecting Frontend

A service file has been created at `src/services/api.ts` configured to talk to `http://localhost:3000`.

To use it in your components, replace the mock data imports with API calls.

**Example:**

```typescript
// Before
import { GAMES } from '../constants';
const games = GAMES;

// After
import { getGames } from '../services/api';
const [games, setGames] = useState([]);

useEffect(() => {
  getGames().then(setGames);
}, []);
```

## 6. Database Management

- **View Data**: You can use Prisma Studio to view and edit data in a nice UI.
  ```bash
  npx prisma studio
  ```
- **Reset Data**: To reset the database and re-seed it:
  ```bash
  npx prisma migrate reset
  ```


## 7. Troubleshooting

- If you see "PrismaClient not initialized", try running `npx prisma generate` in the `server` folder.
- If port 3000 is in use, change `PORT` in `server/.env`.
