# ============================================================
# TreeSense AI — Backend Dockerfile
# Project: AI-Driven IoT Framework for Tree Behaviour Analysis
# Author: Prof. Anjit Raja R — RGU CII | Version: 1.0.0
# ============================================================

FROM python:3.11-slim

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev curl libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

# Working directory
WORKDIR /app

# Install Python dependencies first (layer cache optimisation)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Create non-root user
RUN useradd -m -u 1000 treesense && chown -R treesense:treesense /app
USER treesense

# Expose API port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "2", "--log-level", "info"]
