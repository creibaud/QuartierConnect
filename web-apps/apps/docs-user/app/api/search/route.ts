import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Static export: precompute the index at build, no server at runtime.
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source);
