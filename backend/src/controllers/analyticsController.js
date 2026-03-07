const UserAnalytics = require('../models/UserAnalytics');

const ZERO_ANALYTICS = Object.freeze({
  questionsAsked: 0,
  summariesGenerated: 0,
  studyTimeMs: 0
});

function parseIncrement(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

async function getOrCreateAnalytics(userId) {
  return UserAnalytics.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, ...ZERO_ANALYTICS } },
    { new: true, upsert: true }
  );
}

exports.getAnalytics = async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Invalid token payload.' });
  }
  try {
    const analytics = await getOrCreateAnalytics(req.userId);
    return res.json({
      userId: String(req.userId),
      analytics: {
        questionsAsked: analytics.questionsAsked || 0,
        summariesGenerated: analytics.summariesGenerated || 0,
        studyTimeMs: analytics.studyTimeMs || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.incrementAnalytics = async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ message: 'Invalid token payload.' });
  }
  const questionsAsked = parseIncrement(req.body?.questionsAsked);
  const summariesGenerated = parseIncrement(req.body?.summariesGenerated);
  const studyTimeMs = parseIncrement(req.body?.studyTimeMs);
  const hasAnyIncrement = questionsAsked > 0 || summariesGenerated > 0 || studyTimeMs > 0;

  try {
    if (!hasAnyIncrement) {
      const analytics = await getOrCreateAnalytics(req.userId);
      return res.json({
        userId: String(req.userId),
        analytics: {
          questionsAsked: analytics.questionsAsked || 0,
          summariesGenerated: analytics.summariesGenerated || 0,
          studyTimeMs: analytics.studyTimeMs || 0
        }
      });
    }

    const analytics = await UserAnalytics.findOneAndUpdate(
      { userId: req.userId },
      {
        $inc: {
          questionsAsked,
          summariesGenerated,
          studyTimeMs
        },
        $setOnInsert: { userId: req.userId }
      },
      { new: true, upsert: true }
    );

    return res.json({
      userId: String(req.userId),
      analytics: {
        questionsAsked: analytics.questionsAsked || 0,
        summariesGenerated: analytics.summariesGenerated || 0,
        studyTimeMs: analytics.studyTimeMs || 0
      }
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
