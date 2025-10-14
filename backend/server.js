// Chemin réseau vers le fichier partagé
//const DATA_FILE = path.join('\\\\serveur\\projet_partage', 'data.json');
//const BASE_PATH = '\\\\nas-gabes\\330-nitrate-share\\TRAVAUX\\TRAVAUX-DES-ARRETS-TECHNIQUES\\Base-de-données-AT';
//const DATA_FILE = path.join(BASE_PATH, "data.json");
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware avec limite de taille augmentée
app.use(cors());
app.use(express.json({ limit: '10mb' })); // ← AJOUT IMPORTANT
app.use(express.urlencoded({ limit: '10mb', extended: true })); // ← AJOUT IMPORTANT

// Ensure data.json exists and is valid
const ensureDataFile = async () => {
  try {
    await fs.access(DATA_FILE);
    const data = await fs.readFile(DATA_FILE, 'utf8');
    JSON.parse(data);
  } catch (error) {
	  console.warn("⚠️ Fichier réseau inaccessible");
    
  }
};

// Fonction utilitaire
function isFileAccessError(error) {
  return (
    error.code === "ENOENT" ||
    error.code === "EACCES" ||
    error.code === "EPERM"
  );
}

// GET /works
app.get("/works", async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8");
    return res.json(JSON.parse(data));
  } catch (error) {
    console.error("❌ Error reading works:", error);

    if (isFileAccessError(error)) {
      return res.status(503).json({ error: "Application non disponible (pas de connexion au fichier partagé)" });
    }

    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// POST /works
app.post("/works", async (req, res) => {
  try {
    const newData = req.body;

    if (!newData || typeof newData !== "object") {
      return res.status(400).json({ error: "Format de données invalide" });
    }

    // Lire les données existantes
    let existingData = {};
    try {
      const fileData = await fs.readFile(DATA_FILE, "utf8");
      existingData = JSON.parse(fileData);
    } catch (error) {
      // Fichier n'existe pas ou vide - créer nouveau
      console.log("Création nouveau fichier de données");
    }

    // Fusionner les données (nouveau écrase ancien)
    const mergedData = { ...existingData, ...newData };

    await fs.writeFile(DATA_FILE, JSON.stringify(mergedData, null, 2), "utf8");
    return res.json({ success: true, message: "Données fusionnées avec succès" });
  } catch (error) {
    console.error("❌ Error saving works:", error);

    if (isFileAccessError(error)) {
      return res.status(503).json({ error: "Impossible d'enregistrer (pas de connexion au fichier partagé)" });
    }

    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// DELETE /works/:id
app.delete("/works/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fs.readFile(DATA_FILE, "utf8");
    const works = JSON.parse(data);

    let itemDeleted = false;

    for (const date of Object.keys(works)) {
      const before = works[date].length;
      works[date] = works[date].filter((w) => w.id !== id);
      if (works[date].length < before) {
        itemDeleted = true;
      }
    }

    if (itemDeleted) {
      await fs.writeFile(DATA_FILE, JSON.stringify(works, null, 2), "utf8");
      return res.json({ success: true });
    }

    return res.status(404).json({ error: "Work item not found" });
  } catch (error) {
    console.error("❌ Error deleting work:", error);

    if (isFileAccessError(error)) {
      return res.status(503).json({ error: "Impossible de supprimer (pas de connexion au fichier partagé)" });
    }

    return res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Initialize server
const startServer = async () => {
  await ensureDataFile();
  app.listen(PORT, () => {
    console.log(`✅ Backend server running on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log(`  GET  http://localhost:${PORT}/works`);
    console.log(`  POST http://localhost:${PORT}/works`);
    console.log(`  DELETE http://localhost:${PORT}/works/:id`);
  });
};

startServer().catch(console.error);
