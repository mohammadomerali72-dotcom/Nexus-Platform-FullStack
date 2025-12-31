const Meeting = require('../models/Meeting');

// 1. Schedule a new meeting
exports.scheduleMeeting = async (req, res) => {
    try {
        const { title, date, time, investorId, entrepreneurId } = req.body;
        
        // Check for conflict (Milestone 3 requirement)
        const conflict = await Meeting.findOne({ where: { date, time, status: 'accepted' } });
        if (conflict) {
            return res.status(400).json({ message: "Time slot already booked!" });
        }

        const meeting = await Meeting.create({ title, date, time, investorId, entrepreneurId });
        res.status(201).json({ message: "Meeting requested!", meeting });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 2. Get meetings for a specific user
exports.getMeetings = async (req, res) => {
    try {
        const { userId } = req.params;
        const meetings = await Meeting.findAll({ where: { entrepreneurId: userId } }); // Or investorId
        res.json(meetings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};