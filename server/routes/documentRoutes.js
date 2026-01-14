const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Document = require('../models/Document');

// 1. Configure how files are saved on your laptop
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/'); // Saves to server/uploads/
    },
    filename: (req, file, cb) => {
        // Names file: DOC-1704987654321.pdf
        cb(null, 'DOC-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 10 } // 10MB limit
});

// 2. API to Upload Document (Milestone 5)
router.post('/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file provided" });

        // Save metadata to your MySQL 'documents' table
        const newDoc = await Document.create({
            fileName: req.file.originalname,
            fileType: req.file.mimetype,
            filePath: req.file.filename,
            uploadedBy: req.body.userId || 1, // Get ID from frontend
            status: 'Pending'
        });

        res.status(201).json({ 
            status: "success",
            message: "Document saved to XAMPP and Uploads folder!", 
            document: newDoc 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. API to Fetch All Documents (For the Preview feature)
router.get('/all', async (req, res) => {
    try {
        const docs = await Document.findAll({ order: [['createdAt', 'DESC']] });
        res.json(docs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;