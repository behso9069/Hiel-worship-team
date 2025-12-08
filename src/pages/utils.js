export function createPageUrl(pageName) {
  return `/${pageName}`;
}

export function getUrlParam(paramName) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(paramName);
}
