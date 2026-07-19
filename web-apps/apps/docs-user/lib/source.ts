import { docs } from 'collections/server';
import { loader } from 'fumadocs-core/source';
import { i18n } from '@/lib/i18n';

// See https://fumadocs.dev/docs/headless/source-api for more info
export const source = loader({
  baseUrl: '/',
  i18n,
  source: docs.toFumadocsSource(),
});
