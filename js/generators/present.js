// Présentation partagée des items de mémoire de type WAIS-IV : les éléments
// s'affichent un par un (un par seconde), puis un champ de saisie apparaît.

export function presentThenAsk(stage, ctx, symbols, interval, { label, inputmode = 'text', pattern = '' }) {
  let typed = '';
  stage.innerHTML = '<div class="mem-stage"><button class="btn primary" type="button" data-start>Commencer</button></div>';
  stage.querySelector('[data-start]').addEventListener('click', () => {
    const box = stage.querySelector('.mem-stage');
    box.innerHTML = '<div class="span-digit" aria-live="assertive"></div>';
    const el = box.firstElementChild;
    symbols.forEach((s, i) => {
      ctx.later(() => { el.textContent = s; }, i * interval);
      ctx.later(() => { el.textContent = ''; }, i * interval + interval * 0.8);
    });
    ctx.later(() => {
      box.innerHTML = `<form class="span-form"><label>${label}
        <input data-in inputmode="${inputmode}" autocomplete="off" autocapitalize="characters" spellcheck="false"${pattern ? ` pattern="${pattern}"` : ''}></label>
        <button class="btn primary" type="submit">Valider</button></form>`;
      const input = box.querySelector('[data-in]');
      input.addEventListener('input', () => { typed = input.value; });
      input.focus();
      box.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); ctx.finish(input.value); });
    }, symbols.length * interval + 300);
  });
  return { collect: () => typed };
}
