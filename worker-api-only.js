import { handleApiRequest } from './worker/api.js';

/** Local API testing only — no static assets binding. */
export default {
  async fetch(request, env) {
    return handleApiRequest(request, env);
  },
};
