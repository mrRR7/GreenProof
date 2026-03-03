// Rule-based ESG claim extractor
// Replaces geminiService.ts — no API key required

export interface ESGClaimRaw {
  text: string;
  category: 'quantitative' | 'future_target' | 'comparative' | 'general';
  status: 'consistent' | 'inconsistent' | 'unsupported' | 'incomplete';
  explanation: string;
  supportingData?: string;
  mathematicalCheck?: {
    formula: string;
    result: string;
    expected: string;
    isCorrect: boolean;
  };
}

// ── Keyword patterns ───────────────────────────────────────────────────────────

const QUANTITATIVE_PATTERNS = [
  /\d+[\.,]?\d*\s*(%|percent|tonnes?|tons?|kwh|mwh|gwh|litr|gallon|kg|metric\s*ton)/gi,
  /reduced?\s+(?:by\s+)?\d+/gi,
  /increased?\s+(?:by\s+)?\d+/gi,
  /emission[s]?\s+of\s+\d+/gi,
  /\d+[\.,]?\d*\s*million\s*(tonnes?|kwh|litr)/gi,
];

const FUTURE_TARGET_PATTERNS = [
  /by\s+20\d{2}/gi,
  /target[s]?\s+to/gi,
  /aim[s]?\s+to/gi,
  /commit[s]?\w*\s+to/gi,
  /plan[s]?\s+to/gi,
  /goal[s]?\s+(is|are|to)/gi,
  /will\s+(reduce|achieve|reach|cut|eliminate|become)/gi,
  /net.?zero/gi,
  /carbon.?neutral/gi,
];

const COMPARATIVE_PATTERNS = [
  /compared?\s+to\s+(20\d{2}|baseline|previous)/gi,
  /\d+%\s+(lower|higher|less|more|reduction|increase)\s+than/gi,
  /versus\s+(20\d{2}|last\s+year|prior\s+year)/gi,
  /year.on.year/gi,
  /from\s+\d+[\.,]?\d*\s+to\s+\d+[\.,]?\d*/gi,
];

const ESG_TOPIC_KEYWORDS = [
  'carbon', 'emission', 'greenhouse', 'ghg', 'co2', 'climate',
  'energy', 'renewable', 'solar', 'wind', 'electricity',
  'water', 'waste', 'recycle', 'recycling', 'landfill',
  'sustainability', 'sustainable', 'environmental',
  'diversity', 'inclusion', 'gender', 'workforce', 'employee',
  'safety', 'injury', 'health', 'wellbeing',
  'governance', 'board', 'ethics', 'compliance', 'transparency',
  'supply chain', 'supplier', 'community', 'social',
  'biodiversity', 'deforestation', 'land use',
  'esg', 'scope 1', 'scope 2', 'scope 3',
];

// ── Sentence splitter ──────────────────────────────────────────────────────────

function splitIntoSentences(text: string): string[] {
  // Split on periods/newlines but keep abbreviations intact
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 800);
}

// ── Classify a sentence ────────────────────────────────────────────────────────

function classifySentence(sentence: string): ESGClaimRaw['category'] {
  const lower = sentence.toLowerCase();
  if (FUTURE_TARGET_PATTERNS.some(p => p.test(sentence))) {
    // reset lastIndex for global patterns
    FUTURE_TARGET_PATTERNS.forEach(p => p.lastIndex = 0);
    return 'future_target';
  }
  FUTURE_TARGET_PATTERNS.forEach(p => p.lastIndex = 0);

  if (COMPARATIVE_PATTERNS.some(p => p.test(sentence))) {
    COMPARATIVE_PATTERNS.forEach(p => p.lastIndex = 0);
    return 'comparative';
  }
  COMPARATIVE_PATTERNS.forEach(p => p.lastIndex = 0);

  if (QUANTITATIVE_PATTERNS.some(p => p.test(sentence))) {
    QUANTITATIVE_PATTERNS.forEach(p => p.lastIndex = 0);
    return 'quantitative';
  }
  QUANTITATIVE_PATTERNS.forEach(p => p.lastIndex = 0);

  return 'general';
}

// ── Extract numbers from sentence ─────────────────────────────────────────────

function extractNumbers(sentence: string): number[] {
  const matches = sentence.match(/\d+[\.,]?\d*/g) || [];
  return matches.map(n => parseFloat(n.replace(',', '.'))).filter(n => !isNaN(n));
}

// ── Try a simple math check ────────────────────────────────────────────────────

function tryMathCheck(sentence: string): ESGClaimRaw['mathematicalCheck'] | undefined {
  // Pattern: "reduced by X% from A to B"
  const pattern = /from\s+([\d.,]+)\s+to\s+([\d.,]+).*?([\d.,]+)\s*%/i;
  const match = sentence.match(pattern);
  if (match) {
    const from     = parseFloat(match[1].replace(',', '.'));
    const to       = parseFloat(match[2].replace(',', '.'));
    const claimed  = parseFloat(match[3].replace(',', '.'));
    const actual   = Math.round(Math.abs((from - to) / from) * 100 * 10) / 10;
    const isCorrect = Math.abs(actual - claimed) < 2; // within 2% tolerance
    return {
      formula:   `|${from} - ${to}| / ${from} × 100`,
      result:    `${actual}%`,
      expected:  `${claimed}%`,
      isCorrect,
    };
  }
  return undefined;
}

// ── Determine status ───────────────────────────────────────────────────────────

function determineStatus(
  sentence: string,
  category: ESGClaimRaw['category'],
  mathCheck?: ESGClaimRaw['mathematicalCheck']
): { status: ESGClaimRaw['status']; explanation: string } {

  if (mathCheck) {
    if (mathCheck.isCorrect) {
      return {
        status: 'consistent',
        explanation: `Mathematical check passed: calculated ${mathCheck.result} matches claimed ${mathCheck.expected}.`,
      };
    } else {
      return {
        status: 'inconsistent',
        explanation: `Mathematical inconsistency: calculated ${mathCheck.result} but claim states ${mathCheck.expected}. The numbers do not add up.`,
      };
    }
  }

  if (category === 'future_target') {
    return {
      status: 'incomplete',
      explanation: 'This is a forward-looking target or commitment. Cannot be verified against current data — requires future reporting to confirm.',
    };
  }

  if (category === 'quantitative') {
    const numbers = extractNumbers(sentence);
    if (numbers.length >= 2) {
      return {
        status: 'unsupported',
        explanation: `Quantitative claim with ${numbers.length} figures detected. No baseline or source data provided in the report to verify these numbers independently.`,
      };
    }
    return {
      status: 'unsupported',
      explanation: 'Quantitative claim detected but lacks sufficient supporting data or source references for independent verification.',
    };
  }

  if (category === 'comparative') {
    return {
      status: 'unsupported',
      explanation: 'Comparative claim detected. Baseline data and methodology not provided — independent verification not possible without access to historical records.',
    };
  }

  return {
    status: 'unsupported',
    explanation: 'General ESG statement. No specific measurable data provided to verify this claim.',
  };
}

// ── Extract supporting data snippet ───────────────────────────────────────────

function extractSupportingData(sentence: string): string | undefined {
  const numbers = extractNumbers(sentence);
  const units   = sentence.match(/\d+[\.,]?\d*\s*(%|tonnes?|tons?|kwh|mwh|kg|litr|gallon|million|billion)/gi);
  if (units && units.length > 0) return units.slice(0, 3).join(', ');
  if (numbers.length > 0) return `Values mentioned: ${numbers.slice(0, 4).join(', ')}`;
  return undefined;
}

// ── Main export — drop-in replacement for analyzeESGReport ────────────────────

export async function analyzeESGReport(text: string): Promise<ESGClaimRaw[]> {
  const sentences = splitIntoSentences(text);
  const claims: ESGClaimRaw[] = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    // Only process sentences that mention ESG-related topics
    const isESGRelated = ESG_TOPIC_KEYWORDS.some(kw => lower.includes(kw));
    if (!isESGRelated) continue;

    // Skip very generic sentences with no substance
    const hasSubstance =
      QUANTITATIVE_PATTERNS.some(p => { const r = p.test(sentence); p.lastIndex = 0; return r; }) ||
      FUTURE_TARGET_PATTERNS.some(p => { const r = p.test(sentence); p.lastIndex = 0; return r; }) ||
      COMPARATIVE_PATTERNS.some(p =>  { const r = p.test(sentence); p.lastIndex = 0; return r; }) ||
      sentence.length > 80;

    if (!hasSubstance) continue;

    const category       = classifySentence(sentence);
    const mathCheck      = tryMathCheck(sentence);
    const { status, explanation } = determineStatus(sentence, category, mathCheck);
    const supportingData = extractSupportingData(sentence);

    claims.push({
      text:     sentence,
      category,
      status,
      explanation,
      supportingData,
      mathematicalCheck: mathCheck,
    });
  }

  // If nothing found, return a placeholder so the UI doesn't crash
  if (claims.length === 0) {
    claims.push({
      text:        'No specific ESG claims could be automatically extracted from this document.',
      category:    'general',
      status:      'unsupported',
      explanation: 'The document may use non-standard formatting or the text could not be parsed. Try a different PDF.',
    });
  }

  return claims;
}
