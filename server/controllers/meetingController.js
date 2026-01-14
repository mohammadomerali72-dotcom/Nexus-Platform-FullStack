
exports.updateMeetingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted' or 'rejected'

        const meeting = await Meeting.findByPk(id);
        if (!meeting) {
            return res.status(404).json({ message: "Meeting not found" });
        }

        meeting.status = status;
        await meeting.save();

        res.json({ message: `Meeting ${status} successfully!`, meeting });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};