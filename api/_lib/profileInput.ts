function owns(input: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function validDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseProfileUpdate(value: unknown) {
  const input =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const hasIsBusy = owns(input, 'isBusy');
  const hasAvailableDate = owns(input, 'availableDate');
  const isBusy = input.isBusy;
  const availableDateText = text(input.availableDate);
  const availableDate = hasAvailableDate ? availableDateText : null;

  if (hasIsBusy && typeof isBusy !== 'boolean') {
    throw new Error('invalid_is_busy');
  }
  if (hasAvailableDate && !validDateOnly(availableDateText)) {
    throw new Error('invalid_available_date');
  }

  return {
    hasDisplayName: owns(input, 'displayName'),
    displayName: text(input.displayName),
    hasBio: owns(input, 'bio'),
    bio: text(input.bio),
    hasAvatarUrl: owns(input, 'avatarUrl'),
    avatarUrl: text(input.avatarUrl),
    hasPricingNote: owns(input, 'pricingNote'),
    pricingNote: text(input.pricingNote),
    hasIsBusy,
    isBusy: typeof isBusy === 'boolean' ? isBusy : true,
    hasAvailableDate,
    availableDate,
  };
}
