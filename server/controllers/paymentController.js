const Transaction = require('../models/Transaction');

// 1. Process a new Transaction (Milestone 6)
exports.processPayment = async (req, res) => {
    try {
        const { amount, type, userId, description } = req.body;

        // Create record in MySQL
        const transaction = await Transaction.create({
            amount,
            type,
            userId,
            description: description || `Transaction: ${type}`,
            status: 'completed' // Simulated successful payment
        });

        res.status(201).json({ 
            status: "success", 
            message: "Transaction logged successfully", 
            transaction 
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

// 2. Get Transaction History for a User
exports.getHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await Transaction.findAll({ 
            where: { userId },
            order: [['createdAt', 'DESC']] 
        });
        res.json(history);
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};