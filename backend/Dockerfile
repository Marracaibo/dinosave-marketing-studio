FROM python:3.11-slim

# Installa FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia requirements e installa dipendenze
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia il codice
COPY . .

# Crea le directory necessarie
RUN mkdir -p temp output assets/overlays assets/audio

# Esponi la porta
EXPOSE 10000

# Avvia l'applicazione
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "10000"]
