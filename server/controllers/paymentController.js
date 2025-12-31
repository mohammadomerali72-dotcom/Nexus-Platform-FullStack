const Transaction = require('../models/Transaction');
// For a real app, you'd use your Stripe Secret Key from .env
const stripe = require('stripe')('sk_test_mock_key'); 

exports.processPayment = async (req, res) => {
    try {
        const { amount, userId, type, description } = req.body;

        // Simulate a successful transaction
        const transaction = await Transaction.create({
            amount,
            userId,
            type,
            description,
            status: 'completed' // In a real app, this updates after Stripe webhook
        });

        res.status(201).json({ message: "Transaction successful!", transaction });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await Transaction.findAll({ where: { userId } });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};