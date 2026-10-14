/**
 * Groups contracts into SectionList sections by calendar month, e.g. "October 2026".
 * Input is expected to already be sorted newest-first (the SQL query does that),
 * and insertion order is preserved so the sections inherit that ordering.
 */

export function monthKeyFromDate(isoDate) {
  const match = /^(\d{4})-(\d{2})/.exec(isoDate || '');
  if (!match) return null;
  return `${match[1]}-${match[2]}`;
}

export function formatMonthLabel(isoDate) {
  const key = monthKeyFromDate(isoDate);
  if (!key) return 'Unknown date';

  const [year, month] = key.split('-');
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return 'Unknown date';

  const name = new Date(Date.UTC(Number(year), monthIndex, 1)).toLocaleString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });

  return `${name} ${year}`;
}

export function groupContractsByMonth(contracts) {
  const sections = [];
  const indexByKey = new Map();

  for (const contract of contracts) {
    const key = monthKeyFromDate(contract.eventDate) ?? 'unknown';

    if (!indexByKey.has(key)) {
      indexByKey.set(key, sections.length);
      sections.push({ key, title: formatMonthLabel(contract.eventDate), data: [] });
    }

    sections[indexByKey.get(key)].data.push(contract);
  }

  return sections;
}

export function formatDisplayDate(isoDate) {
  const key = monthKeyFromDate(isoDate);
  if (!key) return isoDate || 'No date';

  const [year, month] = key.split('-');
  const day = (isoDate || '').slice(8, 10);
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return isoDate || 'No date';

  const name = new Date(Date.UTC(Number(year), monthIndex, 1)).toLocaleString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });

  return day ? `${day} ${name} ${year}` : `${name} ${year}`;
}
