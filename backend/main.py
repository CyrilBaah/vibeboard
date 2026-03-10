import os
from contextlib import asynccontextmanager
from typing import Optional

import asyncpg
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://vibeboard:vibeboard@localhost:5432/vibeboard",
)

db_pool: asyncpg.Pool = None


# ─── Schema ─────────────────────────────────────────────────────────────────

async def create_tables(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id           SERIAL PRIMARY KEY,
            username     VARCHAR(50) UNIQUE NOT NULL,
            avatar       VARCHAR(10) NOT NULL,
            bio          VARCHAR(200),
            hype_points  INTEGER DEFAULT 0,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS vibes (
            id          SERIAL PRIMARY KEY,
            user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
            message     VARCHAR(140) NOT NULL,
            hype_count  INTEGER DEFAULT 0,
            created_at  TIMESTAMPTZ DEFAULT NOW()
        )
        """
    )
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS hype_votes (
            id              SERIAL PRIMARY KEY,
            vibe_id         INTEGER REFERENCES vibes(id) ON DELETE CASCADE,
            voter_username  VARCHAR(50) NOT NULL,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE (vibe_id, voter_username)
        )
        """
    )


# ─── Seed data ──────────────────────────────────────────────────────────────

async def seed_data(conn: asyncpg.Connection) -> None:
    count = await conn.fetchval("SELECT COUNT(*) FROM users")
    if count > 0:
        return

    seed_users = [
        ("chaoslord",   "🔥", "I break things for fun"),
        ("glitchwitch", "🧙", "chaos is my love language"),
        ("voidpuncher", "👾", "hitting prod on fridays"),
        ("discoinfra",  "🕺", "my k8s dances to the beat"),
    ]
    for username, avatar, bio in seed_users:
        await conn.execute(
            "INSERT INTO users (username, avatar, bio) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            username, avatar, bio,
        )

    seed_vibes = [
        ("chaoslord",   "just deleted production. no ragrets. 🚀"),
        ("glitchwitch", "kubernetes said 'OOMKilled' and honestly? relatable"),
        ("voidpuncher", "it's not chaos engineering, it's aggressive testing 😈"),
        ("discoinfra",  "my pods are crashing but the vibes are immaculate ✨"),
    ]
    for username, message in seed_vibes:
        user = await conn.fetchrow("SELECT id FROM users WHERE username = $1", username)
        if user:
            await conn.execute(
                "INSERT INTO vibes (user_id, message) VALUES ($1, $2)",
                user["id"], message,
            )


# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10)
    async with db_pool.acquire() as conn:
        await create_tables(conn)
        await seed_data(conn)
    yield
    await db_pool.close()


# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(title="VibeBoard API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic models ─────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    avatar: str
    bio: Optional[str] = None


class VibeCreate(BaseModel):
    username: str
    message: str


class HypeRequest(BaseModel):
    voter_username: str


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except Exception as exc:
        return {"status": "ok", "database": "disconnected", "error": str(exc)}


@app.get("/leaderboard")
async def leaderboard():
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT username, avatar, bio, hype_points
            FROM users
            ORDER BY hype_points DESC
            LIMIT 10
            """
        )
    return [dict(row) for row in rows]


@app.get("/vibes")
async def get_vibes():
    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT v.id, v.message, v.hype_count, v.created_at,
                   u.username, u.avatar
            FROM   vibes v
            JOIN   users u ON v.user_id = u.id
            ORDER  BY v.created_at DESC
            LIMIT  20
            """
        )
    return [dict(row) for row in rows]


@app.post("/users", status_code=200)
async def create_user(user: UserCreate):
    clean_username = user.username.lower().strip()
    if not clean_username:
        raise HTTPException(status_code=400, detail="username is required")
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO users (username, avatar, bio)
            VALUES ($1, $2, $3)
            ON CONFLICT (username)
            DO UPDATE SET avatar = EXCLUDED.avatar,
                          bio    = EXCLUDED.bio
            RETURNING id, username, avatar, bio, hype_points, created_at
            """,
            clean_username, user.avatar, user.bio,
        )
    return dict(row)


@app.get("/users/{username}")
async def get_user(username: str):
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, username, avatar, bio, hype_points, created_at
            FROM   users
            WHERE  username = $1
            """,
            username.lower(),
        )
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)


@app.post("/vibes", status_code=201)
async def post_vibe(vibe: VibeCreate):
    clean_username = vibe.username.lower().strip()
    async with db_pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id FROM users WHERE username = $1", clean_username
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        row = await conn.fetchrow(
            """
            INSERT INTO vibes (user_id, message)
            VALUES ($1, $2)
            RETURNING id, message, hype_count, created_at
            """,
            user["id"], vibe.message,
        )
    return dict(row)


@app.post("/vibes/{vibe_id}/hype")
async def hype_vibe(vibe_id: int, request: HypeRequest):
    voter_username = request.voter_username.lower().strip()
    if not voter_username:
        raise HTTPException(status_code=400, detail="voter_username is required")

    async with db_pool.acquire() as conn:
        vibe = await conn.fetchrow(
            "SELECT id, user_id FROM vibes WHERE id = $1", vibe_id
        )
        if not vibe:
            raise HTTPException(status_code=404, detail="Vibe not found")

        try:
            await conn.execute(
                "INSERT INTO hype_votes (vibe_id, voter_username) VALUES ($1, $2)",
                vibe_id, voter_username,
            )
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=409, detail="Already hyped this vibe")

        await conn.execute(
            "UPDATE vibes SET hype_count = hype_count + 1 WHERE id = $1", vibe_id
        )
        await conn.execute(
            "UPDATE users SET hype_points = hype_points + 1 WHERE id = $1",
            vibe["user_id"],
        )
        row = await conn.fetchrow(
            "SELECT id, message, hype_count, created_at FROM vibes WHERE id = $1",
            vibe_id,
        )
    return dict(row)
