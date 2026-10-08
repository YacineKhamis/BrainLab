import { runValidation, unitTests } from './validate.js';
import { esc } from '../js/util.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
if (params.get('n')) $('#n').value = params.get('n');

$('#unit').innerHTML = unitTests().map((t) => `<li class="${t.ok ? 'good' : 'bad'}">${t.ok ? '✓' : '✗'} ${esc(t.name)}${t.error ? ` — ${esc(t.error)}` : ''}</li>`).join('');

async function run() {
  const n = Math.max(10, Number($('#n').value) || 1000);
  $('#go').disabled = true;
  $('#prog').hidden = false;
  $('#report tbody').innerHTML = '';
  $('#status').textContent = 'Tests en cours…';
  const t0 = performance.now();
  const rows = await runValidation({
    n,
    onProgress: (p, row) => {
      $('#prog').value = p;
      $('#status').textContent = `Tests en cours… ${Math.round(p * 100)} % (${row.category}, niveau ${row.level})`;
    },
    onRow: (r) => {
      const reasons = Object.entries(r.reasons).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(' ; ');
      const tr = document.createElement('tr');
      if (r.ambiguous || r.failures || r.renderErrors || r.nondeterministic) tr.className = 'r-lo';
      tr.innerHTML = `<td>${esc(r.category)}</td><td>${r.level}</td><td>${r.generated}</td><td>${r.attempts}</td><td>${(r.rejectionRate * 100).toFixed(1)} %</td><td>${r.unique}</td><td>${r.ambiguous}</td><td>${r.failures}</td><td>${r.nondeterministic}</td><td>${r.renderErrors}</td><td>${r.avgMs.toFixed(2)} ms</td><td>${r.maxMs.toFixed(1)} ms</td><td class="small">${esc(reasons || '—')}</td>`;
      $('#report tbody').appendChild(tr);
    },
  });
  const total = rows.reduce((s, r) => s + r.generated, 0);
  const amb = rows.reduce((s, r) => s + r.ambiguous, 0);
  const bad = rows.reduce((s, r) => s + r.failures + r.renderErrors + r.nondeterministic, 0);
  const secs = ((performance.now() - t0) / 1000).toFixed(1);
  $('#status').textContent = `${total} items générés en ${secs} s — ${amb} item ambigu affiché, ${bad} anomalie${bad > 1 ? 's' : ''}. ${amb === 0 && bad === 0 ? '✓ SUCCÈS' : '✗ ÉCHEC'}`;
  $('#status').className = `big ${amb === 0 && bad === 0 ? 'ok-text' : 'warn'}`;
  document.body.dataset.done = amb === 0 && bad === 0 ? 'pass' : 'fail';
  $('#go').disabled = false;
}

$('#cfg').addEventListener('submit', (e) => { e.preventDefault(); run(); });
if (params.get('auto') === '1') run();
