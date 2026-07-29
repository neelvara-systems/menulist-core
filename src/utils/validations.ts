const isString = (value: unknown): value is string => typeof value === 'string';

export const ValidateEmailPhone = (value: unknown): boolean => {
  const emailVerify = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,3}$/;
  const verifyPhone = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;

  return isString(value) && (emailVerify.test(value) || verifyPhone.test(value));
};

export const ValidateEmail = (value: unknown): boolean => {
  const emailVerify = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,3}$/;

  return isString(value) && emailVerify.test(value);
};

export const ValidatePhone = (value: unknown): boolean => {
  const verifyPhone = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;

  return isString(value) && verifyPhone.test(value);
};

export const ValidateWebsiteURLs = (value: unknown): boolean => {
  const verifyURL = /^[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;

  return isString(value) && verifyURL.test(value);
};
