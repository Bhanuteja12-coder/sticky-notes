/* Defensive wrapper: wait for DOM and catch initialization errors so we can debug easily */
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('[sticky] initializing');
    const board = document.getElementById('board');
    const addBtn = document.getElementById('addNote');
    const clearBtn = document.getElementById('clearAll');
    const colorPicker = document.getElementById('colorPicker');
    const template = document.getElementById('noteTemplate');

    if (!board || !template) {
      console.error('[sticky] required DOM elements missing', {board, template});
      return showInitError('Required page elements are missing. Check that sticky.html and script.js are in the same folder.');
    }

    const SHEETS_KEY = 'sticky_sheets_v1'; // stores metadata for sheets (id, name, active)
    const STORAGE_KEY = 'sticky_notes_v1';
    const CONNECTIONS_KEY = 'sticky_notes_connections_v1';
    let sheets = []; // {id, name}
    let activeSheetId = null;
    let notes = [];
    let connections = [];
    let connectMode = false;
    let connectFirst = null;
    let removeMode = false;

    function save() {
      try { localStorage.setItem(STORAGE_KEY + '_' + activeSheetId, JSON.stringify(notes)); }
      catch(e){ console.warn('[sticky] failed saving to localStorage', e); }
    }

    function load() {
      if (!activeSheetId) return;
      const raw = localStorage.getItem(STORAGE_KEY + '_' + activeSheetId);
      if (!raw) return;
      try {
        notes = JSON.parse(raw) || [];
      } catch (e) {
        console.error('[sticky] Failed to parse notes', e);
        notes = [];
      }
    }

    function createNoteObject(opts = {}) {
      return Object.assign({
        id: 'n_' + Date.now() + Math.random().toString(36).slice(2,6),
        x: 40 + Math.random() * 200,
        y: 40 + Math.random() * 140,
        w: 200,
        h: 160,
        color: '#f9f871',
        content: 'New note'
      }, opts);
    }

    function render() {
      board.innerHTML = '';
      for (const n of notes) board.appendChild(createNoteElement(n));
      renderConnections();
    }

    function loadConnections(){
      if (!activeSheetId) return;
      const raw = localStorage.getItem(CONNECTIONS_KEY + '_' + activeSheetId);
      if(!raw) return;
      try{ connections = JSON.parse(raw) || []; }catch(e){ connections = []; }
    }

    function saveConnections(){
      try{ localStorage.setItem(CONNECTIONS_KEY + '_' + activeSheetId, JSON.stringify(connections)); }catch(e){console.warn(e)}
    }

  function renderConnections(){
      // ensure svg overlay exists
      let svg = board.querySelector('svg.connect-layer');
      if (!svg){
        svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.classList.add('connect-layer');
        board.appendChild(svg);
      }
      // clear
      while(svg.firstChild) svg.removeChild(svg.firstChild);
      // draw each connection as a path between centers
      for (const c of connections){
        const fromEl = board.querySelector(`[data-id="${c.from}"]`);
        const toEl = board.querySelector(`[data-id="${c.to}"]`);
        if (!fromEl || !toEl) continue;
        const p1 = centerOf(fromEl);
        const p2 = centerOf(toEl);
        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  const dx = Math.abs(p2.x - p1.x);
  const cpx = (p1.x + p2.x) / 2;
  const cpy = (p1.y + p2.y) / 2 - Math.min(80, dx/2);
  const d = `M ${p1.x} ${p1.y} Q ${cpx} ${cpy} ${p2.x} ${p2.y}`;
  path.setAttribute('d', d);
  path.setAttribute('stroke', 'crimson');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.style.cursor = 'pointer';
        // attach metadata and click to remove
        path.dataset.from = c.from;
        path.dataset.to = c.to;
        path.addEventListener('click', (ev)=>{
          ev.stopPropagation();
          // if remove mode active, delete; otherwise ignore (or we could select)
          if (removeMode){
            connections = connections.filter(x => !(x.from === c.from && x.to === c.to));
            saveConnections();
            render();
          }
        });
        svg.appendChild(path);
      }
    }

    function centerOf(el){
      const r = el.getBoundingClientRect();
      const b = board.getBoundingClientRect();
      // return top-left corner with a small inset so it appears like knot from corner
      const insetX = 8;
      const insetY = 8;
      return { x: (r.left - b.left) + insetX, y: (r.top - b.top) + insetY };
    }

    function createNoteElement(note) {
      const el = template.content.firstElementChild.cloneNode(true);
      el.style.left = note.x + 'px';
      el.style.top = note.y + 'px';
      el.style.width = note.w + 'px';
      el.style.height = note.h + 'px';
  el.dataset.id = note.id;
  // set classes explicitly (avoid passing space-containing string to classList.add)
  el.className = 'note ' + colorClassFor(note.color);
      const body = el.querySelector('.note-body');
      body.value = note.content || '';
      // ensure textarea shows correct initial height based on content
      function autoGrow(){
        try{
          // reset to auto to measure
          body.style.height = 'auto';
          const headerH = el.querySelector('.note-header')?.offsetHeight || 0;
          const newBodyH = Math.max(32, body.scrollHeight);
          body.style.height = newBodyH + 'px';
          note.h = Math.max(80, headerH + newBodyH + 8);
          el.style.height = note.h + 'px';
        }catch(e){console.warn('[sticky] autoGrow failed', e)}
      }
      // set initial size immediately
      requestAnimationFrame(autoGrow);

      // Delete
      el.querySelector('.delete').addEventListener('click', (ev) => {
        ev.stopPropagation();
        // remove note
        notes = notes.filter(x => x.id !== note.id);
        // also remove any connections referencing this note
        connections = connections.filter(c => c.from !== note.id && c.to !== note.id);
        saveConnections();
        save();
        render();
      });

      // connect-mode click handler
      el.addEventListener('click', (ev)=>{
        if (!connectMode) return;
        ev.stopPropagation();
        if (!connectFirst){ connectFirst = note.id; el.classList.add('connect-selected'); return; }
        if (connectFirst === note.id){ connectFirst = null; el.classList.remove('connect-selected'); return; }
        // create connection
        connections.push({from: connectFirst, to: note.id});
        saveConnections();
        connectFirst = null;
        render();
      });
      // Content changes (textarea) -> auto-grow and persist
      body.addEventListener('input', () => {
        note.content = body.value;
        // auto-grow textarea to fit new content
        autoGrow();
        // store width and new computed height
        note.w = el.offsetWidth;
        note.h = el.offsetHeight;
        save();
      });

      // Observe native textarea resize (when user drags the corner)
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
          // update parent note size to match textarea + header
          const headerH = el.querySelector('.note-header')?.offsetHeight || 0;
          note.w = Math.max(120, body.offsetWidth);
          note.h = Math.max(80, headerH + body.offsetHeight + 8);
          el.style.width = note.w + 'px';
          el.style.height = note.h + 'px';
          save();
        });
        ro.observe(body);
      } else {
        // fallback: periodically sync while the note is focused
        let tSync;
        body.addEventListener('focus', () => {
          tSync = setInterval(()=>{
            note.w = el.offsetWidth;
            note.h = el.offsetHeight;
            save();
          }, 500);
        });
        body.addEventListener('blur', ()=>{ clearInterval(tSync); tSync = null; });
      }

      // Dragging
      el.addEventListener('pointerdown', startDrag);
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', note.id);
      });

      // Context: change color on double-click header
      el.addEventListener('dblclick', (ev) => {
        ev.stopPropagation();
        // cycle colors
        const colors = ['#f9f871','#ffd1dc','#c8f7c5','#c9ddff','#f7e6c2'];
        const idx = colors.indexOf(note.color);
        note.color = colors[(idx + 1) % colors.length];
        el.className = 'note ' + colorClassFor(note.color);
        el.style.left = note.x + 'px'; // keep position
        el.style.top = note.y + 'px';
        save();
      });

      return el;

      // --- drag helpers ---
      function startDrag(e) {
        if (e.target.closest('.delete') || e.target.closest('.resize')) return;
        const rect = el.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        el.classList.add('dragging');
        let rafId = null;
        const move = (ev) => {
          note.x = Math.max(8, ev.clientX - offsetX - board.getBoundingClientRect().left);
          note.y = Math.max(8, ev.clientY - offsetY - board.getBoundingClientRect().top);
          el.style.left = note.x + 'px';
          el.style.top = note.y + 'px';
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(()=>{
            renderConnections();
            rafId = null;
          });
        };
        const up = () => {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          el.classList.remove('dragging');
          if (rafId) cancelAnimationFrame(rafId);
          // final render and save
          renderConnections();
          save();
        };
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
      }
    }

    function colorClassFor(color){
      // return only the color class (no 'note' prefix)
      switch(color){
        case '#ffd1dc': return 'color-pink';
        case '#c8f7c5': return 'color-green';
        case '#c9ddff': return 'color-blue';
        case '#f7e6c2': return 'color-peach';
        default: return 'color-yellow';
      }
    }

    addBtn.addEventListener('click', () => {
      const n = createNoteObject({color: colorPicker.value});
      notes.push(n);
      save();
      render();
      // focus last created note for editing
      requestAnimationFrame(() => {
        const el = board.querySelector(`[data-id="${n.id}"]`);
        if (el) el.querySelector('.note-body').focus();
      });
    });

    // --- Sheet management ---
    const sheetPicker = document.getElementById('sheetPicker');
    const newSheetBtn = document.getElementById('newSheet');
    const renameSheetBtn = document.getElementById('renameSheet');
    const deleteSheetBtn = document.getElementById('deleteSheet');
  const exportSheetBtn = document.getElementById('exportSheet');
  const exportPdfBtn = document.getElementById('exportPdf');
  const toExcelBtn = document.getElementById('toExcel');
  const convertAllToExcelBtn = document.getElementById('convertAllToExcel');
  const changeSizeBtn = document.getElementById('changeSizeBtn');
  const sizeMenu = document.getElementById('sizeMenu');

    function saveSheetsMeta(){
      try{ localStorage.setItem(SHEETS_KEY, JSON.stringify(sheets)); }catch(e){console.warn(e)}
    }

    function loadSheetsMeta(){
      const raw = localStorage.getItem(SHEETS_KEY);
      if(!raw) return;
      try{ sheets = JSON.parse(raw) || []; }catch(e){ sheets = []; }
    }

    function renderSheetPicker(){
      if (!sheetPicker) return;
      sheetPicker.innerHTML = '';
      for (const s of sheets){
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name + ' — ' + (s.size || 'medium');
        if (s.id === activeSheetId) opt.selected = true;
        sheetPicker.appendChild(opt);
      }
    }

    function createSheet(name, size){
      const id = 's_' + Date.now() + Math.random().toString(36).slice(2,6);
      const s = {id, name: name || 'Sheet ' + (sheets.length + 1), size: size || 'biggest'};
      sheets.push(s);
      saveSheetsMeta();
      return s;
    }

    function switchToSheet(id){
      activeSheetId = id;
      renderSheetPicker();
      // apply board size class based on sheet metadata
      try{
        const s = sheets.find(x => x.id === activeSheetId) || {};
        const size = s.size || 'medium';
        board.classList.remove('size-small','size-medium','size-large','size-biggest','size-excel');
        board.classList.add('size-' + size);
      }catch(e){console.warn(e)}
      // load notes/connections for this sheet
      notes = [];
      connections = [];
      load();
      loadConnections();
      if (!notes || notes.length === 0) {
        notes = [createNoteObject({content:'New sheet — start planning here'})];
        save();
      }
      render();
    }

    if (sheetPicker){
      sheetPicker.addEventListener('change', ()=>{
        if (!sheetPicker.value) return;
        switchToSheet(sheetPicker.value);
      });
    }

    newSheetBtn?.addEventListener('click', ()=>{
      // ask user for size (accept common aliases)
      const choice = prompt('Sheet size? enter one of: small, medium, large, biggest, excel (alias: "damn big")', 'biggest');
      const raw = (choice || 'biggest').toLowerCase().trim();
      const aliasMap = { 'damn big':'excel', 'excel':'excel', 'giant':'excel' };
      const normalized = aliasMap[raw] || raw;
      const valid = ['small','medium','large','biggest','excel'];
      const finalSize = valid.includes(normalized) ? normalized : 'biggest';
      const s = createSheet('Sheet ' + (sheets.length + 1), finalSize);
      saveSheetsMeta();
      switchToSheet(s.id);
    });

    renameSheetBtn?.addEventListener('click', ()=>{
      const cur = sheets.find(x => x.id === activeSheetId);
      if (!cur) return alert('No sheet selected');
      const name = prompt('Rename sheet', cur.name);
      if (!name) return;
      cur.name = name;
      saveSheetsMeta();
      renderSheetPicker();
    });

    deleteSheetBtn?.addEventListener('click', ()=>{
      if (!activeSheetId) return alert('No sheet selected');
      if (!confirm('Delete this sheet and all its notes?')) return;
      // remove meta
      sheets = sheets.filter(s => s.id !== activeSheetId);
      // remove storage entries
      localStorage.removeItem(STORAGE_KEY + '_' + activeSheetId);
      localStorage.removeItem(CONNECTIONS_KEY + '_' + activeSheetId);
      saveSheetsMeta();
      // switch to first sheet or create new
      if (sheets.length > 0) switchToSheet(sheets[0].id);
      else {
        const s = createSheet('Sheet 1');
        switchToSheet(s.id);
      }
    });

    // Export current sheet as JSON
    exportSheetBtn?.addEventListener('click', ()=>{
      if (!activeSheetId) return alert('No sheet selected');
      const sheetMeta = sheets.find(s => s.id === activeSheetId) || {id: activeSheetId, name: 'sheet'};
      const payload = {
        meta: sheetMeta,
        notes: notes,
        connections: connections,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fname = `${sheetMeta.name || 'sheet'}-${sheetMeta.id || activeSheetId}-${Date.now()}.json`;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });

    // Export current sheet as PDF via print dialog
    exportPdfBtn?.addEventListener('click', ()=>{
      if (!activeSheetId) return alert('No sheet selected');
      // clone board HTML
      const clone = board.cloneNode(true);
      // remove interactive attributes that don't make sense in print
      clone.querySelectorAll('[data-id]').forEach(el => el.removeAttribute('draggable'));
      // remove UI chrome: delete buttons, pins, resize handles, and mode indicators
      clone.querySelectorAll('.delete, .pin, .connect-selected, .dragging, .note .delete').forEach(n => n.remove());
      // replace textareas with plain divs that contain their value (textareas sometimes don't render value in a new document)
      clone.querySelectorAll('textarea').forEach(ta => {
        const div = document.createElement('div');
        // preserve simple styling by using the original textarea's class names
        div.className = ta.className + ' printable-text';
        // copy value safely
        div.textContent = ta.value || ta.textContent || '';
        // ensure whitespace/newlines are preserved
        div.style.whiteSpace = 'pre-wrap';
        div.style.font = window.getComputedStyle(ta).font || '14px sans-serif';
        // copy padding/background if needed
        div.style.padding = window.getComputedStyle(ta).padding;
        // replace
        ta.parentNode.replaceChild(div, ta);
      });

      // Ensure SVG connect layer is visible (it should be cloned), remove pointer-events
      clone.querySelectorAll('svg.connect-layer').forEach(svg => svg.style.pointerEvents = 'none');

      // create a new window
      const w = window.open('', '_blank');
      if (!w) return alert('Popup blocked. Allow popups for this site to export PDF.');
      // basic styles: include current page styles
      const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(n => n.outerHTML).join('\n');
      // build printable HTML: include sheet name in title
      const printable = `<!doctype html><html><head><meta charset="utf-8"><title>${(sheets.find(s=>s.id===activeSheetId)||{name:'sheet'}).name}</title>${styles}<style>body{margin:0;padding:20px;font-family:inherit} .board{background:transparent;box-shadow:none} .note .note-body{background:transparent;border:none} .printable-text{white-space:pre-wrap}</style></head><body>
        ${clone.outerHTML}
      </body></html>`;
      w.document.open();
      w.document.write(printable);
      w.document.close();
      // give the new window a moment to render
      setTimeout(()=>{
        w.focus();
        w.print();
      }, 600);
    });

    // Convert active sheet to excel size
    toExcelBtn?.addEventListener('click', ()=>{
      if (!activeSheetId) return alert('No sheet selected');
      const s = sheets.find(x=>x.id === activeSheetId);
      if (!s) return alert('Sheet not found');
      s.size = 'excel';
      saveSheetsMeta();
      switchToSheet(s.id);
    });

    // Change size dropdown
    changeSizeBtn?.addEventListener('click', (ev)=>{
      ev.stopPropagation();
      if (!sizeMenu) return;
      sizeMenu.style.display = sizeMenu.style.display === 'block' ? 'none' : 'block';
    });
    // Hide menu when clicking outside
    document.addEventListener('click', ()=>{ if (sizeMenu) sizeMenu.style.display = 'none'; });
    // handle size choice
    sizeMenu?.addEventListener('click', (ev)=>{
      const btn = ev.target.closest('.size-option');
      if (!btn) return;
      const newSize = btn.dataset.size;
      if (!activeSheetId) return alert('No sheet selected');
      const s = sheets.find(x=>x.id === activeSheetId);
      if (!s) return alert('Sheet not found');
      s.size = newSize;
      saveSheetsMeta();
      switchToSheet(s.id);
      sizeMenu.style.display = 'none';
    });

    // Convert all sheets with size 'biggest' to 'excel'
    convertAllToExcelBtn?.addEventListener('click', ()=>{
      const biggest = sheets.filter(x => x.size === 'biggest');
      if (!biggest || biggest.length === 0) return alert('No sheets with size "biggest" found');
      if (!confirm(`Convert ${biggest.length} sheet(s) from biggest → excel?`)) return;
      for (const s of biggest) s.size = 'excel';
      saveSheetsMeta();
      // if active sheet was changed, reapply
      switchToSheet(activeSheetId || sheets[0]?.id);
    });

    // initialize sheets: load meta, ensure at least one sheet, then switch
    loadSheetsMeta();
    if (!sheets || sheets.length === 0){
      const s = createSheet('Planning','biggest');
      const s2 = createSheet('DSA','biggest');
      saveSheetsMeta();
      switchToSheet(s.id);
    } else {
      // pick first sheet if none active
      if (!activeSheetId) switchToSheet(sheets[0].id);
      else switchToSheet(activeSheetId);
    }

    // connect toggle button
    const connectToggle = document.getElementById('connectToggle');
    if (connectToggle){
      connectToggle.addEventListener('click', ()=>{
        connectMode = !connectMode;
        connectToggle.classList.toggle('connect-btn-active', connectMode);
        connectFirst = null;
        // disable remove mode if enabling connect mode
        if (connectMode){
          removeMode = false;
          const rm = document.getElementById('removeKnotToggle');
          if (rm) rm.classList.remove('remove-btn-active');
        }
      });
    }

    const removeKnotToggle = document.getElementById('removeKnotToggle');
    if (removeKnotToggle){
      removeKnotToggle.addEventListener('click', ()=>{
        removeMode = !removeMode;
        removeKnotToggle.classList.toggle('remove-btn-active', removeMode);
        // disable connect mode if enabling remove
        if (removeMode){
          connectMode = false;
          if (connectToggle) connectToggle.classList.remove('connect-btn-active');
          connectFirst = null;
        }
      });
    }

    clearBtn.addEventListener('click', () => {
      if (!confirm('Delete all notes?')) return;
      notes = [];
      save();
      render();
    });

    // Dark mode toggle
    const darkToggle = document.getElementById('darkToggle');
    const THEME_KEY = 'sticky_theme_v1';
    function applyTheme(t){
      document.body.setAttribute('data-theme', t === 'dark' ? 'dark' : '');
      localStorage.setItem(THEME_KEY, t);
      if (darkToggle) darkToggle.textContent = t === 'dark' ? '☀️' : '🌙';
    }
    if (darkToggle){
      darkToggle.addEventListener('click', ()=>{
        const current = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      });
    }
    // initialize theme
    const savedTheme = localStorage.getItem('sticky_theme_v1') || 'light';
    applyTheme(savedTheme);

  // init
    load();
  loadConnections();
    if (!notes || notes.length === 0) {
      notes = [createNoteObject({content:'Welcome! Double-click a note to change its color. Drag to move. Resize using the ↔ handle.'})];
      save();
    }
    render();

    // global error reporter to surface runtime errors into console
    window.addEventListener('error', (ev) => {
      console.error('[sticky] uncaught error', ev.error || ev.message, ev);
    });

    console.log('[sticky] initialized OK', {notesLength: notes.length});

    function showInitError(msg){
      try{
        const e = document.createElement('div');
        e.style.padding = '12px';
        e.style.background = '#fee';
        e.style.color = '#700';
        e.style.border = '1px solid #fbb';
        e.textContent = 'Sticky notes error: ' + msg + ' (see console)';
        document.body.insertBefore(e, document.body.firstChild);
      } catch(e){ console.error(e); }
    }

  } catch (err) {
    console.error('[sticky] initialization failed', err);
    try { document.body.insertAdjacentHTML('afterbegin', '<div style="padding:12px;background:#fee;color:#700;border:1px solid #fbb">Sticky notes failed to initialize — see console for details.</div>'); } catch(e){}
  }
});
