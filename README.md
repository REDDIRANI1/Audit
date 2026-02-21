# Audit AI

Enterprise-grade speech-intelligence platform for automating call QA and compliance audits.

## Architecture

- **Frontend**: Next.js 14, TailwindCSS, ShadCN UI
- **Backend**: FastAPI (Python 3.11), Celery, Redis
- **Database**: PostgreSQL 16 with JSONB
- **Storage**: MinIO (S3-compatible)
- **ML Pipeline**: FFmpeg, Silero VAD, Pyannote, Faster-Whisper, vLLM

## Quick Start

```bash
# Clone and configure
cp docker/.env.example docker/.env

# Start all services
cd docker
docker compose up -d

# Run database migrations
cd ../backend
pip install -r requirements.txt
alembic upgrade head

# Start frontend dev server
cd ../frontend
npm install
npm run dev
```

## Services

| Service   | Port  | Description              |
|-----------|-------|--------------------------|
| Frontend  | 3000  | Next.js web app          |
| API       | 8000  | FastAPI REST API          |
| Redis     | 6379  | Message broker & cache    |
| Postgres  | 5432  | Primary database          |
| MinIO     | 9000  | Object storage (S3)       |
| MinIO UI  | 9001  | MinIO admin console       |

## Project Structure

```
├── backend/          # FastAPI + Celery workers
│   ├── app/          # Application code
│   ├── workers/      # Celery tasks
│   └── alembic/      # Database migrations
├── frontend/         # Next.js 14 app
└── docker/           # Docker Compose & configs
```
