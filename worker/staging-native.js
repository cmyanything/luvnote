import worker from './index.js';
import {createJpegMarkerSearch} from './jpeg-search.js';

// Isolated same-Worker CPU experiment. Production's main/config stay unchanged.
export default {
  ...worker,
  fetch(request, env, ctx) {
    return worker.fetch(request, env.ENVIRONMENT === 'staging'
      ? {...env, JPEG_MARKER_SEARCH: createJpegMarkerSearch} : env, ctx);
  },
};
