# Urban Grid Management System - FastAPI Backend
# Build context: project root (docker build -f backend/Dockerfile .)

FROM python:3.11-slim

WORKDIR /app

# System deps for some Python packages (e.g. numpy, prophet)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code
COPY backend/ ./backend/
COPY src/ ./src/

# Ensure backend can resolve project root
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
