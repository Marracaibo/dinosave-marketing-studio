# 🦖💰 DinoSave Marketing Studio

Web app per scaricare, editare e remixare video da TikTok e Instagram con overlay personalizzati (come il DinoSave danzante!), audio custom e testi rage-bait.

## 🚀 Features

- **Download senza watermark** da TikTok e Instagram
- **Upload diretto** di video dal tuo dispositivo
- **Overlay video** (dino danzante, loghi, etc.) con posizione e scala configurabili
- **Audio custom** - rimuovi audio originale o sostituiscilo
- **Testo/Hook** - aggiungi scritte rage-bait con font personalizzabili
- **Preview in tempo reale** del video originale e remixato
- **Download diretto** del video processato

## 📋 Requisiti

- **Python 3.9+**
- **Node.js 18+**
- **FFmpeg** (deve essere installato nel sistema)

### Installare FFmpeg

**Windows:**
```bash
winget install FFmpeg
# oppure scarica da https://ffmpeg.org/download.html
```

**Mac:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

## 🛠️ Setup

### 1. Backend (Python)

```bash
cd backend

# Crea virtual environment
python -m venv venv

# Attiva virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Installa dipendenze
pip install -r requirements.txt

# Avvia il server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (Next.js)

```bash
cd frontend

# Installa dipendenze
npm install

# Avvia il dev server
npm run dev
```

### 3. Apri l'app

Vai su [http://localhost:3000](http://localhost:3000)

## 📁 Struttura Progetto

```
video-remix-studio/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app
│   │   └── routers/
│   │       ├── download.py   # Download da TikTok/IG
│   │       ├── process.py    # Video processing con FFmpeg
│   │       └── assets.py     # Gestione overlay e audio
│   ├── assets/
│   │   ├── overlays/         # File overlay (dino, etc.)
│   │   └── audio/            # Tracce audio
│   ├── temp/                 # File temporanei
│   ├── output/               # Video processati
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── page.tsx          # Homepage
    │   ├── layout.tsx
    │   └── globals.css
    ├── components/
    │   ├── VideoInput.tsx    # Upload/download video
    │   ├── VideoPreview.tsx  # Player video
    │   ├── OverlaySelector.tsx
    │   ├── AudioSelector.tsx
    │   ├── TextOverlay.tsx
    │   └── ProcessButton.tsx
    └── package.json
```

## 🎬 Come Usare

1. **Carica un video**
   - Incolla un link TikTok/Instagram e clicca "Scarica"
   - Oppure trascina un file video direttamente

2. **Aggiungi il Dino** 🦖
   - Carica il tuo overlay (video con sfondo trasparente .mov o .webm)
   - Scegli posizione e dimensione

3. **Configura l'audio**
   - Rimuovi l'audio originale se vuoi
   - Carica una traccia audio custom

4. **Aggiungi un Hook**
   - Scrivi il tuo testo rage-bait
   - Oppure usa il pulsante 🎲 per uno casuale

5. **Remixa!**
   - Clicca "Remixa il Video"
   - Scarica il risultato

## 🔧 API Endpoints

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/download` | POST | Scarica video da URL |
| `/api/download/info` | GET | Info video senza download |
| `/api/process/remix` | POST | Processa video con effetti |
| `/api/process/upload-video` | POST | Upload video diretto |
| `/api/assets/overlays` | GET | Lista overlay |
| `/api/assets/audio` | GET | Lista audio |
| `/api/assets/overlays/upload` | POST | Carica overlay |
| `/api/assets/audio/upload` | POST | Carica audio |

## ⚠️ Note Legali

Questo tool è per uso personale/educativo. Rispetta i termini di servizio delle piattaforme e i diritti d'autore dei contenuti.

## 🦖 Il Dino

Per il dino danzante, ti serve un file video con sfondo trasparente:
- Formato: `.mov` (ProRes 4444) o `.webm` (VP9 con alpha)
- Caricalo nella sezione "Overlay Dino"

---

Made with 💜 for the content grind
