const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'data.json');
// Chemin réseau vers le fichier partagé
//const DATA_FILE = path.join('\\\\serveur\\projet_partage', 'data.json');
//const BASE_PATH = '\\\\nas-gabes\\330-nitrate-share\\TRAVAUX\\TRAVAUX-DES-ARRETS-TECHNIQUES\\Base-de-données-AT';
//const DATA_FILE = path.join(BASE_PATH, "data.json");


// Middleware
app.use(cors());
app.use(express.json());

// Ensure data.json exists and is valid
const ensureDataFile = async () => {
  try {
    await fs.access(DATA_FILE);
    // Validate JSON structure
    const data = await fs.readFile(DATA_FILE, 'utf8');
    JSON.parse(data);
  } catch (error) {
    console.log('Creating/fixing data.json file...');
    await fs.writeFile(DATA_FILE, '{}', 'utf8');
  }
};

// GET /works - Retrieve all maintenance works
app.get('/works', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const works = JSON.parse(data);
    res.json(works);
  } catch (error) {
    console.error('Error reading works:', error);
    // Return empty object if file is corrupted
    res.json({});
  }
});

// POST /works - Save maintenance works
app.post('/works', async (req, res) => {
  try {
    const worksData = req.body;
    await fs.writeFile(DATA_FILE, JSON.stringify(worksData, null, 2), 'utf8');
    res.json({ success: true, message: 'Data saved successfully' });
  } catch (error) {
    console.error('Error saving works:', error);
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

// DELETE /works/:id - Delete a specific work item
app.delete('/works/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const works = JSON.parse(data);
    
    let itemDeleted = false;
    
    // Find and remove the item with the given ID
    Object.keys(works).forEach(date => {
      const initialLength = works[date].length;
      works[date] = works[date].filter(work => work.id !== id);
      if (works[date].length < initialLength) {
        itemDeleted = true;
      }
    });
    
    if (itemDeleted) {
      await fs.writeFile(DATA_FILE, JSON.stringify(works, null, 2), 'utf8');
      res.json({ success: true, message: 'Work item deleted successfully' });
    } else {
      res.status(404).json({ success: false, error: 'Work item not found' });
    }
  } catch (error) {
    console.error('Error deleting work:', error);
    res.status(500).json({ success: false, error: 'Failed to delete work item' });
  }
});

// Initialize server
const startServer = async () => {
  await ensureDataFile();
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log(`  GET  http://localhost:${PORT}/works`);
    console.log(`  POST http://localhost:${PORT}/works`);
    console.log(`  DELETE http://localhost:${PORT}/works/:id`);
  });
};

startServer().catch(console.error);