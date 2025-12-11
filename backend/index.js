const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = "mongodb+srv://admin:@cluster0.hjjxzoq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

console.log("---------------------------------------------------");
console.log("Attempting to connect with URI:");

console.log(MONGO_URI.replace(/:([^:@]{1,})@/, ':****@')); 
console.log("---------------------------------------------------");

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch(err => {
        console.log("❌ Connection Failed:");
        console.log(err.message);
        console.log("👉 CHECK: Is your username 'admin' in Atlas?");
        console.log("👉 CHECK: Is your IP allowed in 'Network Access'?");
    });

const tokenSchema = new mongoose.Schema({
    name: String,
    tokenNumber: Number,
    status: { type: String, default: 'waiting' },
    createdAt: { type: Date, default: Date.now }
});

const queueStateSchema = new mongoose.Schema({
    currentServing: { type: Number, default: 0 },
    lastIssued: { type: Number, default: 0 }
});

const Token = mongoose.model('Token', tokenSchema);
const QueueState = mongoose.model('QueueState', queueStateSchema);

const initQueue = async () => {
    try {
        const state = await QueueState.findOne();
        if (!state) { 
            await new QueueState({ currentServing: 0, lastIssued: 0 }).save();
        }
    } catch (e) { console.log("Waiting for DB...") }
};
setTimeout(initQueue, 3000);

app.post('/join', async (req, res) => {
    try {
        const state = await QueueState.findOne();
        state.lastIssued += 1;
        await state.save();
        const newToken = new Token({ name: req.body.name, tokenNumber: state.lastIssued });
        await newToken.save();
        res.json(newToken);
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

app.get('/status/:id', async (req, res) => {
    try {
        const token = await Token.findById(req.params.id);
        const state = await QueueState.findOne();
        const peopleAhead = token.tokenNumber - state.currentServing - 1;
        res.json({ token, currentServing: state.currentServing, peopleAhead: peopleAhead > 0 ? peopleAhead : 0 });
    } catch (e) { res.status(404).json({ error: "Not found" }); }
});

app.post('/queue/next', async (req, res) => {
    try {
        const state = await QueueState.findOne();
        state.currentServing += 1;
        await state.save();
        res.json({ message: "Next!", currentServing: state.currentServing });
    } catch (e) { res.status(500).json({ error: "DB Error" }); }
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
