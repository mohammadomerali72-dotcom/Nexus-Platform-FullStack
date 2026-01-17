/**
 * MEETING CONTROLLER
 * Project: Nexus - Investor & Entrepreneur Collaboration Platform
 * Logic: Scheduling, Conflict Detection, and Status Updates (Accept/Reject)
 */

const Meeting = require('../models/Meeting');
const { Op } = require('sequelize');

/**
 * 1. SCHEDULE A NEW MEETING
 * Includes conflict detection to prevent double booking at the same time and date.
 */
exports.scheduleMeeting = async (req, res) => {
    try {
        const { title, date, time, investorId, entrepreneurId } = req.body;

        // Validation: Check if the time slot is already taken for an accepted meeting
        const conflict = await Meeting.findOne({ 
            where: { 
                date, 
                time, 
                status: 'accepted' 
            } 
        });

        if (conflict) {
            return res.status(400).json({ 
                status: "error",
                message: "This time slot is already booked. Please choose another time." 
            });
        }

        // Create meeting record in MySQL
        const meeting = await Meeting.create({ 
            title, 
            date, 
            time, 
            investorId, 
            entrepreneurId,
            status: 'pending' 
        });

        res.status(201).json({ 
            status: "success",
            message: "Meeting requested successfully.", 
            meeting 
        });
    } catch (error) {
        res.status(500).json({ 
            status: "error",
            message: "Failed to schedule meeting",
            error: error.message 
        });
    }
};

/**
 * 2. GET USER MEETINGS
 * Retrieves all meetings where the user is either the Investor or the Entrepreneur.
 */
exports.getMeetings = async (req, res) => {
    try {
        const { userId } = req.params;

        const meetings = await Meeting.findAll({
            where: {
                [Op.or]: [
                    { entrepreneurId: userId },
                    { investorId: userId }
                ]
            },
            order: [['date', 'ASC'], ['time', 'ASC']]
        });

        res.status(200).json({
            status: "success",
            count: meetings.length,
            meetings
        });
    } catch (error) {
        res.status(500).json({ 
            status: "error",
            message: "Failed to fetch meetings",
            error: error.message 
        });
    }
};

/**
 * 3. UPDATE MEETING STATUS
 * Handles the "Accept" or "Reject" logic from the frontend.
 */
exports.updateMeetingStatus = async (req, res) => {
    try {
        const { id } = req.params; // Meeting ID from URL
        const { status } = req.body; // 'accepted' or 'rejected' from button click

        // Find the specific meeting in XAMPP database
        const meeting = await Meeting.findByPk(id);
        
        if (!meeting) {
            return res.status(404).json({ 
                status: "error",
                message: "Meeting record not found." 
            });
        }

        // Update and save status
        meeting.status = status;
        await meeting.save();

        res.status(200).json({ 
            status: "success",
            message: `Meeting has been ${status} successfully!`, 
            meeting 
        });
    } catch (error) {
        res.status(500).json({ 
            status: "error",
            message: "Failed to update status",
            error: error.message 
        });
    }
};