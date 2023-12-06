export const getNextPageFromLink = (link?: string) => {
  const nextPageUrl = /<(?<nextPageUrl>[^>]+)>;\s*rel="next"/.exec(link || '')?.groups?.nextPageUrl;
  if (!nextPageUrl) return null;
  const url = new URL(nextPageUrl);
  const rawPage = url.searchParams.get('page');
  const page = Number(rawPage);
  if (Number.isNaN(page) || !rawPage) {
    return null;
  }
  return page;
};
