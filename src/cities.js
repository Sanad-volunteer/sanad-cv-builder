// One spelling for each Syrian city, whatever the person typed in the free-text "city" field of the form
// ("Damascus", "damascus", "دمشق", "سوريا / دمشق", "طرطوس - سوريا" ...). Used by the admin page only (display, filter, search, Excel);
// the stored data is not changed. Names that are not in the list are kept as typed (with the country word removed).
// To add a city: add [arabic name, ...other spellings] to CITIES.
const CITIES = [
  ['دمشق', 'damascus', 'dimashq', 'damas', 'الشام', 'sham', 'ash sham'],
  ['ريف دمشق', 'rif dimashq', 'rural damascus', 'damascus countryside', 'damascus suburbs', 'damascus rural'],
  ['حلب', 'aleppo', 'halab'],
  ['حمص', 'homs', 'hims'],
  ['حماة', 'hama', 'hamah', 'hamaa'],
  ['اللاذقية', 'latakia', 'lattakia', 'al ladhiqiyah', 'ladhiqiyah', 'lazkia', 'lathakia'],
  ['طرطوس', 'tartus', 'tartous', 'tartous city'],
  ['إدلب', 'idlib', 'idleb'],
  ['دير الزور', 'deir ez zor', 'deir ezzor', 'deir al zour', 'deir alzour', 'deir ez-zor', 'deir ezzour', 'dayr az zawr'],
  ['الرقة', 'raqqa', 'raqqah', 'ar raqqah'],
  ['الحسكة', 'hasakah', 'hasaka', 'hassakeh', 'al hasakah', 'hasakeh'],
  ['القامشلي', 'qamishli', 'qamishlo', 'kamishli'],
  ['درعا', 'daraa', 'deraa', 'dara a', 'dera a', 'daraa city'],
  ['السويداء', 'suwayda', 'sweida', 'as suwayda', 'suweida', 'sweyda'],
  ['القنيطرة', 'quneitra', 'kuneitra', 'qunaytirah'],
  ['جرمانا', 'jaramana', 'jaramanah'],
  ['دوما', 'douma', 'duma'],
  ['داريا', 'daraya', 'darayya'],
  ['صحنايا', 'sahnaya', 'sahnaia'],
  ['جبلة', 'jableh', 'jabla', 'jebleh'],
  ['بانياس', 'baniyas', 'banias'],
  ['صافيتا', 'safita'],
  ['مصياف', 'masyaf'],
  ['السلمية', 'salamiyah', 'salamieh', 'salamiya'],
  ['القرداحة', 'qardaha', 'qerdaha'],
  ['منبج', 'manbij', 'menbij'],
  ['عفرين', 'afrin'],
  ['اعزاز', 'azaz', 'a zaz'],
  ['الباب', 'al bab', 'albab'],
  ['عين العرب', 'kobani', 'kobane', 'ayn al arab', 'ain al arab'],
  ['تدمر', 'palmyra', 'tadmur'],
  ['يبرود', 'yabroud', 'yabrud'],
  ['الزبداني', 'zabadani', 'zabadany'],
  ['التل', 'tal', 'al tall', 'tall'],
]
const COUNTRY = ['الجمهوريه العربيه السوريه', 'syrian arab republic', 'سوريا', 'سوريه', 'سورية', 'syria', 'syrie']

// letters in one form: no diacritics / tatweel, one alef, ة -> ه, ى -> ي, lower case; punctuation becomes a space
const norm = (s) => String(s || '')
  .toLowerCase()
  .replace(/[ً-ٰٟـ]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .replace(/\s+/g, ' ').trim()

// every spelling (also without the Arabic article "ال") -> the Arabic name shown
const ALIAS = new Map()
for (const [name, ...others] of CITIES) {
  for (const a of [name, ...others]) {
    const n = norm(a)
    ALIAS.set(n, name)
    if (n.startsWith('ال') && n.length > 4) ALIAS.set(n.slice(2), name)
  }
}
const ALIASES = [...ALIAS.keys()].sort((a, b) => b.length - a.length) // the longest first: "ريف دمشق" before "دمشق"
const COUNTRIES = COUNTRY.map(norm)

export function normCity(raw) {
  const text = String(raw || '').trim()
  if (!text) return ''
  let n = ` ${norm(text)} `
  for (const c of COUNTRIES) n = n.split(` ${c} `).join(' ')   // drop the country word
  n = n.replace(/\s+/g, ' ').trim()
  if (!n) return text.replace(/\s+/g, ' ') // only the country was written: keep it
  const hay = ` ${n} `
  for (const a of ALIASES) if (hay.includes(` ${a} `)) return ALIAS.get(a)
  // not a known city: keep what was typed, without the country word and the separators around it
  const cleaned = text.replace(/[\s,،/\-–—|]+/g, ' ').trim()
  return COUNTRY.reduce((t, c) => t.replace(new RegExp(`(^|\\s)${c}(?=\\s|$)`, 'gi'), ' '), cleaned).replace(/\s+/g, ' ').trim() || cleaned
}
