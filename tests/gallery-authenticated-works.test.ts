import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync('src/pages/Gallery.tsx', 'utf8');

test('gallery only fetches works for the logged-in user', () => {
  assert.match(source, /import \{ useAuth \} from '\.\.\/contexts\/AuthContext';/);
  assert.match(source, /const \{ user, loading: authLoading \} = useAuth\(\);/);
  assert.match(source, /if \(!user\) \{/);
  assert.match(source, /fetchWorks\(user\.id\)/);
  assert.doesNotMatch(source, /fetchWorks\(\)\s*[\r\n ]*\.then/);
});
