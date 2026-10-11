export function composeInquiry(data) {
  const subject = `Consulting inquiry: ${data.service || 'Organizational consulting'}`;
  const body = [
    'Hello Irenic Consulting,', '',
    `Name: ${data.name || ''}`, `Work email: ${data.email || ''}`,
    `Organization: ${data.organization || ''}`, `Role: ${data.role || ''}`,
    `Area of interest: ${data.service || ''}`, `Team size: ${data.size || 'Not specified'}`,
    `Preferred timeframe: ${data.timeframe || 'Not specified'}`, '',
    'What we would like to work on:', data.message || '', '',
    'Please contact me about a consulting conversation.'
  ].join('\n');
  return { subject, body, url: `mailto:info@irenicconsulting.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}
