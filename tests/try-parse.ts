import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SkyDataResolver } from '../src/parser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const json = readFileSync(join(__dirname, '../assets/everything.json'), 'utf-8');
const data = SkyDataResolver.parse(json);
const resolved = SkyDataResolver.resolve(data);

// Example of using the data.
const realm = resolved.realms.items.find(r => r.name === 'Vault of Knowledge');
const regularSpirits = realm?.areas?.flatMap(a => a.spirits || []).filter(s => s.type === 'Regular') ?? [];
console.log('Regular spirits in Vault:', regularSpirits.length);
