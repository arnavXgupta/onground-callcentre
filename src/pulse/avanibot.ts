// AvaniBot's replies. A keyword router over what the agent's workspace knows, not an LLM:
// enough to make "ask a question" and Daily Brief real in the demo.

const ACTION_ITEMS: Record<string, { name: string; items: string[]; source: string }> = {
  sunita: { name: 'Sunita Rao', items: ['Approve your quote for Mukunda. Waiting since yesterday.'], source: 'DM with Sunita Rao' },
  priya: { name: 'Priya Krishnan', items: ['Cover her 3pm slot today. She asked this morning.'], source: 'DM with Priya Krishnan' },
  raju: { name: 'Raju Kumar', items: ['Nothing open. He just sent you kudos.'], source: 'DM with Raju Kumar' },
}

export const DAILY_BRIEF = [
  "Here's today's brief:",
  '• Avg handle time 4m 12s, down 8%. Nice improvement.',
  '• CSAT 94% today, up 2 points.',
  '• 5 missed calls worth ₹81,860. Call Faizan A. and Kavitha R. first.',
  '• The 4:30pm callback with Priya Iyer still needs confirming.',
].join('\n')

export const FALLBACK = 'I can pull your daily brief, or action items from a teammate. Try "action items from Priya".'

export function reply(question: string): string {
  const q = question.toLowerCase()
  for (const [key, person] of Object.entries(ACTION_ITEMS)) {
    if (q.includes(key)) {
      return [`Action items from ${person.name}:`, ...person.items.map((i) => `• ${i}`), `Source: ${person.source}`].join('\n')
    }
  }
  if (/\b(brief|summary|today|my day)\b/.test(q)) return DAILY_BRIEF
  return FALLBACK
}
