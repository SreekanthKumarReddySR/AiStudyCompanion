import React from 'react';

export default function OnboardingOverlay({ visible, step, totalSteps, onAdvance, onSkip, stepData }) {
  if (!visible) return null;

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <span className="onboarding-badge">Step {step + 1} of {totalSteps}</span>
        </div>
        <h2 id="onboarding-title">{stepData?.title || 'Learn the essentials'}</h2>
        <p>{stepData?.description || 'Follow this guided walkthrough to get started with StudyCompanion AI.'}</p>
        <div className="onboarding-detail">
          {stepData?.detail || 'This guide will help you learn the core workflows of the app quickly.'}
        </div>
        <div className="onboarding-actions">
          <button className="button" type="button" onClick={onAdvance}>
            {step + 1 >= totalSteps ? 'Finish tour' : 'Got it'}
          </button>
          <button className="button outline onboarding-skip" type="button" onClick={onSkip}>
            Skip guide
          </button>
        </div>
      </div>
    </div>
  );
}
