export const REPORT_REASONS = [
  'Inappropriate content',
  'Harassment or bullying',
  'Hate or abuse',
  'Spam or scam',
  'Illegal or unsafe activity',
  'Other',
] as const;

export const askForReportReason = (label = 'this content') => {
  const input = window.prompt(
    `Why are you reporting ${label}?\n\nExamples: inappropriate content, harassment, spam, unsafe activity.`,
    REPORT_REASONS[0]
  );

  const reason = input?.trim();
  return reason || null;
};

export const confirmBlockUser = (name = 'this user') => {
  return window.confirm(
    `Block ${name}? They will not be able to message you, and their posts/comments will be hidden where possible.`
  );
};
