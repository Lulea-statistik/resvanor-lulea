/* Search inside a native select without changing its value until a user selects. */
(function () {
  'use strict';
  window.setupSearchableSelect = function setupSearchableSelect(selectId, inputId) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);
    if (!select || !input) return;
    let options = [];

    function normalized(value) {
      return value.toLocaleLowerCase('sv-SE').normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').trim();
    }

    function refresh() {
      options = Array.from(select.options).map(o => ({
        value: o.value, label: o.textContent, disabled: o.disabled
      }));
      filter();
    }

    function filter() {
      const query = normalized(input.value);
      const selected = select.value;
      const matches = options.filter(o => normalized(o.label).includes(query));
      const shown = query ? options.filter(o => o.value === selected || matches.includes(o)) : options;
      const unique = Array.from(new Map(shown.map(o => [o.value, o])).values());
      const fragment = document.createDocumentFragment();
      unique.forEach(o => {
        const option = document.createElement('option');
        option.value = o.value;
        option.textContent = o.label;
        option.disabled = o.disabled;
        fragment.append(option);
      });
      if (!matches.length && query) {
        const empty = document.createElement('option');
        empty.textContent = 'Inga träffar';
        empty.disabled = true;
        fragment.append(empty);
      }
      select.replaceChildren(fragment);
      if (unique.some(o => o.value === selected)) select.value = selected;
      const hint = document.getElementById(inputId + '-hint');
      if (hint) hint.textContent = query
        ? matches.length + ' träffar. Välj ett alternativ i listan.'
        : '';
    }

    input.addEventListener('input', filter);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') { input.value = ''; filter(); }
      if (event.key === 'ArrowDown') { event.preventDefault(); select.focus(); }
    });
    select.addEventListener('change', () => {
      // Keep selected option reachable when search text no longer matches.
      filter();
    });
    refresh();
    return { refresh, clear() { input.value = ''; refresh(); } };
  };
})();
