function normalizeText(input) {
  return String(input || '').replace(/\s+/g, ' ').trim();
}

function isEntityQuestion(question) {
  const q = normalizeText(question).toLowerCase();
  if (!q) return false;
  return /\b(who|name|person|candidate|employee|company|organization|org|firm|date|period|duration|project|title)\b/.test(q);
}

function detectIntent(question) {
  const q = normalizeText(question).toLowerCase();
  if (!q) return '';
  if (/\b(who|name|person|candidate|employee)\b/.test(q)) return 'person';
  if (/\b(date|period|duration|when)\b/.test(q)) return 'date';
  if (/\b(project|title)\b/.test(q)) return 'project';
  if (/\b(company|organization|org|firm)\b/.test(q)) return 'company';
  return '';
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function extractNames(context) {
  const text = normalizeText(context);
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g) || [];
  const stop = new Set([
    'Project Was',
    'ShipTech Team',
    'The Project',
    'We Wish',
    'Future Endeavors'
  ]);
  return unique(matches).filter((m) => !stop.has(m));
}

function extractCompanies(context) {
  const text = normalizeText(context);
  const out = [];

  const assignedBy = text.match(/assigned by\s+([A-Za-z0-9&().,\- ]{2,80}?)(?:\s+under\b|[.;]|$)/i);
  if (assignedBy?.[1]) out.push(assignedBy[1].trim());

  const keywordMatches = text.match(/\b[A-Z][A-Za-z0-9&.\- ]+(?:Ltd|LLP|Inc|Corporation|Corp|Technologies|Solutions|Systems|Team)\b/g) || [];
  out.push(...keywordMatches.map((s) => s.trim()));

  return unique(out);
}

function extractDates(context) {
  const text = normalizeText(context);
  const dates = [];
  const range = text.match(/\b(\d{1,2}-[A-Za-z]{3}-\s?\d{4})\s+to\s+(\d{1,2}-[A-Za-z]{3}-\s?\d{4})\b/i);
  if (range) dates.push(`${range[1].replace(/\s+/g, '')} to ${range[2].replace(/\s+/g, '')}`);
  const singles = text.match(/\b\d{1,2}-[A-Za-z]{3}-\s?\d{4}\b/g) || [];
  dates.push(...singles.map((s) => s.replace(/\s+/g, '')));
  return unique(dates);
}

function extractProjectTitles(context) {
  const text = normalizeText(context);
  const out = [];
  const m1 = text.match(/project was titled\s+([A-Za-z0-9_.\- ]{2,100})/i);
  if (m1?.[1]) out.push(m1[1].trim());
  const m2 = text.match(/project title[:\-]?\s*([A-Za-z0-9_.\- ]{2,100})/i);
  if (m2?.[1]) out.push(m2[1].trim());
  return unique(out);
}

function answerEntityQuestion(question, context) {
  if (!isEntityQuestion(question)) return null;
  const intent = detectIntent(question);
  const names = extractNames(context);
  const companies = extractCompanies(context);
  const dates = extractDates(context);
  const projects = extractProjectTitles(context);

  if (intent === 'company') {
    if (companies.length) return `Company/organization mentioned: ${companies[0]}.`;
    return 'The company/organization is not clearly available in the provided document text.';
  }
  if (intent === 'project') {
    if (projects.length) return `Project title mentioned: ${projects[0]}.`;
    return 'The project title is not clearly available in the provided document text.';
  }
  if (intent === 'date') {
    if (dates.length) return `Date/period mentioned: ${dates[0]}.`;
    return 'The date or period is not clearly available in the provided document text.';
  }
  if (intent === 'person') {
    if (names.length) return `Person name mentioned: ${names[0]}.`;
    return 'The person name is not clearly available in the provided document text.';
  }

  return null;
}

module.exports = {
  isEntityQuestion,
  answerEntityQuestion
};
