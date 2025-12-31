# Nexus Platform - Full Stack Collaboration 

##  Project Overview
Nexus is a collaboration platform designed specifically for **Investors** and **Entrepreneurs**. This project was developed as a 3-week Full Stack Development Internship task to create a fully functional ecosystem for business networking.

##  Features Implemented
- **User Authentication:** Secure JWT-based login/signup with role-based access control (Investor vs Entrepreneur).
- **Meeting Scheduler:** Custom API for booking, accepting, and rejecting meetings with built-in conflict detection to prevent double-booking.
- **Video Calling:** Real-time signaling server implemented via Socket.io to facilitate peer-to-peer video communication.
- **Document Chamber:** Secure document upload and storage system for pitch decks using Multer.
- **Payment Section:** Mock transaction system to track deposits, withdrawals, and transfers with a dedicated MySQL history table.
- **Security:** Advanced security including password hashing (Bcrypt), input sanitization, and 2FA mockup.

##  Tech Stack
- **Frontend:** React.js (Vite)
- **Backend:** Node.js & Express.js
- **Database:** MySQL (Managed via XAMPP)
- **ORM:** Sequelize
- **Real-time Communication:** Socket.io

##  Setup & Installation
1. **Database:** Open XAMPP, start Apache/MySQL, and create a database named `nexus_db`.
2. **Backend:** 
   - Navigate to `/server`
   - Run `npm install`
   - Start with `node index.js`
3. **Frontend:**
   - Navigate to `/client`
   - Run `npm install`
   - Start with `npm run dev`

---
**Developer:** Omer Ali  
**Submission Date:** December 31, 2025