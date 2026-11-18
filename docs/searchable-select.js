/* Search input inside the expanded selector, modeled on Lulea-polishandelser. */
(function () {
  'use strict';
  window.setupSearchableSelect = function setupSearchableSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return null;
    select.classList.add('rvu-native-select');

    const previous = select.parentElement.querySelector('.rvu-picker');
    if (previous) previous.remove();

    const picker = document.createElement('div');
    picker.className = 'rvu-picker';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'rvu-picker-button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-expanded', 'false');

    const menu = document.createElement('div');
    menu.className = 'rvu-picker-menu';
    menu.hidden = true;
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'rvu-picker-search';
    search.placeholder = selectId === 'indicator' ? 'Sök indikator…' : 'Sök variabel…';
    search.setAttribute('aria-label', search.placeholder);
    search.autocomplete = 'off';
    const list = document.createElement('div');
    list.className = 'rvu-picker-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', selectId === 'indicator' ? 'Indikatorer' : 'Variabler');
    const empty = document.createElement('div');
    empty.className = 'rvu-picker-empty';
    empty.textContent = 'Inga träffar';

    menu.append(search, list);
    picker.append(button, menu);
    select.after(picker);

    const normalize = text => text.toLocaleLowerCase('sv-SE')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const options = () => [...select.options].map(option => ({
      value: option.value, label: option.textContent || option.value, disabled: option.disabled
    }));
    function sync() {
      const current = select.options[select.selectedIndex];
      button.textContent = current?.textContent || 'Välj';
    }
    function hide(restoreFocus = false) {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      search.value = '';
      if (restoreFocus) button.focus();
    }
    function choose(option) {
      if (option.disabled) return;
      select.value = option.value;
      sync();
      hide(true);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function render() {
      const query = normalize(search.value);
      const matches = options().filter(o => !query || normalize(o.label).includes(query));
      matches.sort((a, b) => {
        if (query) {
          const startsA = normalize(a.label).startsWith(query);
          const startsB = normalize(b.label).startsWith(query);
          if (startsA !== startsB) return startsA ? -1 : 1;
        }
        // Keep the source option order, including any 'all' option at the top.
        return 0;
      });
      list.replaceChildren();
      if (!matches.length) {
        list.append(empty);
        return;
      }
      matches.forEach(o => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'rvu-picker-option';
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(o.value === select.value));
        row.textContent = o.label;
        row.disabled = o.disabled;
        if (o.value === select.value) row.classList.add('selected');
        row.addEventListener('click', () => choose(o));
        list.append(row);
      });
    }
    function show() {
      menu.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      render();
      search.focus();
    }
    button.addEventListener('click', () => menu.hidden ? show() : hide());
    search.addEventListener('input', render);
    search.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); hide(true); }
      else if (event.key === 'Enter') {
        const first = list.querySelector('.rvu-picker-option:not(:disabled)');
        if (first) { event.preventDefault(); first.click(); }
      } else if (event.key === 'ArrowDown') {
        const first = list.querySelector('.rvu-picker-option:not(:disabled)');
        if (first) { event.preventDefault(); first.focus(); }
      }
    });
    list.addEventListener('keydown', event => {
      const current = document.activeElement;
      if (event.key === 'Escape') { event.preventDefault(); hide(true); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const eligible = [...list.querySelectorAll('.rvu-picker-option:not(:disabled)')];
        const index = eligible.indexOf(current);
        const next = eligible[index + (event.key === 'ArrowDown' ? 1 : -1)];
        if (next) { event.preventDefault(); next.focus(); }
      }
    });
    picker.addEventListener('click', event => event.stopPropagation());
    document.addEventListener('click', () => { if (!menu.hidden) hide(); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !menu.hidden) hide(true);
    });
    select.addEventListener('change', () => { sync(); if (!menu.hidden) render(); });
    sync();
    return {
      refresh() { sync(); if (!menu.hidden) render(); },
      clear() { search.value = ''; sync(); hide(); },
    };
  };
})();
