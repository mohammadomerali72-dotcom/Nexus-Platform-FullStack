const express = require('express');
const router = express.Router();
const { 
    scheduleMeeting, 
    getMeetings, 
    updateMeetingStatus 
} = require('../controllers/meetingController');

// 1. Create a meeting (Milestone 3: Scheduling)
// Endpoint: POST /api/meetings/schedule
router.post('/schedule', scheduleMeeting);

// 2. Get all meetings for a specific user (Milestone 3: Calendar Sync)
// Endpoint: GET /api/meetings/:userId
router.get('/:userId', getMeetings);

// 3. Respond to a meeting (Milestone 3: Accept/Reject)
// Endpoint: PUT /api/meetings/respond/:id
// This is the route that allows the "Confirm Accept" button to work
router.put('/respond/:id', updateMeetingStatus);

module.exports = router;