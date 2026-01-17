import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://www.youtube.com/oembed', () => {
    return new HttpResponse(null, { status: 404 });
  }),
];
