const mongoose = require("mongoose")

// Database connection configuration
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    })

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)

    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("📡 Mongoose connected to MongoDB")
    })

    mongoose.connection.on("error", (err) => {
      console.error("❌ Mongoose connection error:", err)
    })

    mongoose.connection.on("disconnected", () => {
      console.log("📴 Mongoose disconnected from MongoDB")
    })

    // Handle application termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close()
      console.log("🔌 MongoDB connection closed through app termination")
      process.exit(0)
    })

    return conn
  } catch (error) {
    console.error("❌ Database connection failed:", error.message)
    process.exit(1)
  }
}

// Database health check
const checkDBHealth = async () => {
  try {
    const state = mongoose.connection.readyState
    const states = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    }

    return {
      status: states[state],
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections),
    }
  } catch (error) {
    return {
      status: "error",
      error: error.message,
    }
  }
}

module.exports = {
  connectDB,
  checkDBHealth,
}
