Getting things started:

# Terminal 1

cd ~/Documents/Projects/Vectr-1/backend
uvicorn voice:app --reload --port 8000

# Terminal 2

cd ~/Documents/Projects/Vectr-1/backend
python agent.py dev

# Terminal 3

cd ~/Documents/Projects/Vectr-1/frontend
npm install # if you haven’t since we moved things
npm run dev
