const mongoose = require('mongoose');

const userAnalyticsSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    questionsAsked: { type: Number, default: 0, min: 0 },
    summariesGenerated: { type: Number, default: 0, min: 0 },
    studyTimeMs: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserAnalytics', userAnalyticsSchema);
