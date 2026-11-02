// The local/standalone Lab keeps its existing entry. The Pages build lives entirely under /mylab/.
const base = import.meta.env?.BASE_URL || '/';
export const labHome = base === '/' ? '/template-lab/' : base;
export const labAsset = (path: string) => `${base}${path.replace(/^\/+/, '')}`;
