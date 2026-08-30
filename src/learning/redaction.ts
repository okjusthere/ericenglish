const patterns: Array<[string, RegExp]> = [
  ['EMAIL', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['PHONE', /(?<!\d)(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?!\d)/g],
  ['SSN', /\b\d{3}-\d{2}-\d{4}\b/g],
  ['ID', /\b(?:account|student|claim|policy)\s*(?:id|number|#)?\s*[:#-]?\s*[A-Z0-9-]{5,}\b/gi],
];
const addressPattern = /\b\d{1,6}\s+[A-Za-z0-9.' -]+\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl)\b/gi;

export function redactPii(text: string, redactAddresses = false): { redacted: string; findings: string[] } {
  const findings: string[] = [];
  let redacted = text;
  for (const [label, pattern] of patterns) redacted = redacted.replace(pattern, () => { findings.push(label); return `[${label}]`; });
  if (redactAddresses) redacted = redacted.replace(addressPattern, () => { findings.push('ADDRESS'); return '[ADDRESS]'; });
  return { redacted, findings };
}
