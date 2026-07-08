export const REPORT_REASONS = [
  'Inappropriate content',
  'Harassment or bullying',
  'Hate or abuse',
  'Spam or scam',
  'Illegal or unsafe activity',
  'Other',
] as const;

export const askForReportReason = (label = 'this content') => {
  return window.prompt(
    `Why are you reporting ${label}?`,
    REPORT_REASONS[0]
  )?.trim() || null;
};

export const confirmBlockUser = (name = 'this user') => {
  return window.confirm(
    `Block ${name}? They will not be able to message you, and their posts/comments will be hidden where possible.`
  );
};
