/**
 * MEETING MANAGEMENT ROUTES
 * Project: Nexus - Investor & Entrepreneur Collaboration Platform
 * Logic: Scheduling, Calendar Sync, and Accept/Reject Responses
 */

const express = require('express');
const router = express.Router();
const { 
    scheduleMeeting, 
    getMeetings, 
    updateMeetingStatus 
} = require('../controllers/meetingController');

/**
 * @route   POST /api/meetings/schedule
 * @desc    Create a new meeting request between an Entrepreneur and Investor
 * @access  Private (Requires Token)
 */
router.post('/schedule', scheduleMeeting);

/**
 * @route   GET /api/meetings/:userId
 * @desc    Retrieve all meetings associated with a specific User ID (for Calendar view)
 * @access  Private (Requires Token)
 */
router.get('/:userId', getMeetings);

/**
 * @route   PUT /api/meetings/respond/:id
 * @desc    Allows a user (Investor) to Accept or Reject a meeting invitation
 * @params  id - The Unique ID of the meeting in MySQL
 * @access  Private (Requires Token)
 */
router.put('/respond/:id', updateMeetingStatus);

module.exports = router;