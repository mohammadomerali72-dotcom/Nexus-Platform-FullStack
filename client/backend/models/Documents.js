// backend/models/Document.js
const mongoose = require('mongoose');

const DocumentVersionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  filename: String,
  url: String,
  publicId: String,
  size: Number,
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signatureUrl: String,
  signaturePublicId: String,
});

const DocumentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  currentVersion: { type: Number, default: 1 },
  versions: [DocumentVersionSchema],
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'active' }, // e.g., active, archived
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
});

DocumentSchema.methods.addVersion = function (version) {
  this.versions.push(version);
  this.currentVersion = version.versionNumber;
  return this.save();
};

module.exports = mongoose.model('Document', DocumentSchema);
