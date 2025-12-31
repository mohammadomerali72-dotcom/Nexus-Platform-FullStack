const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure how files are saved
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// API for uploading a document
router.post('/upload', upload.single('document'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    res.status(200).json({ 
        message: "Document uploaded successfully!", 
        file: req.file.filename 
    });
});

module.exports = router;