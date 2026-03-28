//eslint-disable-next-line
export const ValidateEmailPhone = (value) => {
  const emailVerify = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,3}$/;
  const verifyPhone = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;

  if (emailVerify.test(value)) {
    return true;
  } else if (verifyPhone.test(value)) {
    return true;
  } else {
    return false;
  }
};

export const ValidateEmail = (value) => {
  const emailVerify = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,3}$/;

  if (emailVerify.test(value)) {
    return true;
  } else {
    return false;
  }
};

export const ValidatePhone = (value) => {
  const verifyPhone = /^(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?$/;

  if (verifyPhone.test(value)) {
    return true;
  } else {
    return false;
  }
};

export const ValidateWebsiteURLs = (value) => {
  const verifyURL = /^[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/;

  return verifyURL.test(value);
};