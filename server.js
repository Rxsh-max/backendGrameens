import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://grameen-fpo.netlify.app",
    process.env.FRONTEND_URL || ""
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); 


const makeSchema = () => new mongoose.Schema(
  { _data: { type: mongoose.Schema.Types.Mixed, required: true } },
  { strict: false, timestamps: true }
);


const collections = ['users', 'assessments', 'activityLogs', 'questions', 'categories', 'pages', 'notifications', 'tickets', 'emailConfig'];
const Models = {};
collections.forEach(name => {
  Models[name] = mongoose.model(name, makeSchema());
});




app.get('/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    if (!Models[collection]) return res.status(404).json({ error: 'Collection not found' });

    const docs = await Models[collection].find({});
    
    const data = docs.map(doc => doc._doc._data ?? doc._data);
    res.json(data);
  } catch (err) {
    console.error(`[GET /${req.params.collection}]`, err);
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    if (!Models[collection]) return res.status(404).json({ error: 'Collection not found' });

    const data = req.body; 

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Body must be an array' });
    }

    
    await Models[collection].deleteMany({});
    if (data.length > 0) {
      const docs = data.map(item => ({ _data: item }));
      await Models[collection].insertMany(docs);
    }

    res.json({ success: true, count: data.length });
  } catch (err) {
    console.error(`[PUT /${req.params.collection}]`, err);
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/pages', async (req, res) => {
  try {
    const data = req.body; 

    await Models['pages'].deleteMany({});
    
    await Models['pages'].create({ _data: data });

    res.json({ success: true });
  } catch (err) {
    console.error('[PUT /pages]', err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/pages', async (req, res) => {
  try {
    const doc = await Models['pages'].findOne({});
    if (!doc) return res.json(null);
    const raw = doc._doc._data ?? doc._data;
    res.json(raw);
  } catch (err) {
    console.error('[GET /pages]', err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/health', (_, res) => res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));


const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI 

if (!MONGO_URI || MONGO_URI.includes('YOUR_USERNAME')) {
  console.error('\n❌  MONGO_URI is not set in backend/.env file!');
  console.error('   Please update backend/.env with your MongoDB Atlas connection string.\n');
  process.exit(1);
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅  Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`🚀  Backend running at http://localhost:${PORT}`);
      console.log(`📡  API ready at http://localhost:${PORT}/api`);
    });
  })
  .catch(err => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });
