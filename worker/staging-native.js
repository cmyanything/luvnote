import worker from './index.js';
import scanModule from './jpeg-scan.wasm';
import {createJpegMarkerSearchFactory} from './jpeg-search.js';
const createJpegMarkerSearch = createJpegMarkerSearchFactory(scanModule);

// Isolated same-Worker CPU experiment. Production's main/config stay unchanged.
export default {
  ...worker,
  fetch(request, env, ctx) {
    return worker.fetch(request, env.ENVIRONMENT === 'staging'
      ? {...env, JPEG_MARKER_SEARCH: createJpegMarkerSearch} : env, ctx);
  },
};
