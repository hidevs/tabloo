export const REPO = process.env.REPO || 'hidevs/tabloo';
export const BRANCH = process.env.BRANCH || 'main';
export const [OWNER, NAME] = REPO.split('/');
export const PAGES_ORIGIN = process.env.PAGES_ORIGIN || `https://${OWNER}.github.io/${NAME}/`;
export const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/data/`;
