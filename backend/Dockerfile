FROM python:3.11-slim

# Installa FFmpeg e dipendenze per rembg (AI background removal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia requirements e installa dipendenze
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-scarica i modelli rembg durante il build (evita timeout al primo avvio)
RUN python -c "from rembg import new_session; new_session('u2net')"

# Copia il codice
COPY . .

# Crea le directory necessarie
RUN mkdir -p temp output assets/overlays assets/audio

# Esponi la porta
EXPOSE 10000

# Avvia l'applicazione
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]
