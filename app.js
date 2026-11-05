(function () {
  'use strict';
  const { compute, umkForYear, weightedHours, DEFAULT_MULT } = window.GajiCalc;
  const $ = (id) => document.getElementById(id);
  const STORE = 'gajiJepara.v2';
  const rp = (n) => (n < 0 ? '-Rp ' : 'Rp ') + Math.abs(Math.round(n)).toLocaleString('id-ID');
  const parseMoney = (s) => Number(String(s).replace(/\D/g, '')) || 0;
  const fmtMoney = (n) => (n ? Number(n).toLocaleString('id-ID') : '');
  const HOURS = [0.5, 1, 1.5, 2, 2.5, 3];
  const DAY_TYPES = { kerja: 'Hari kerja', libur: 'Hari libur (mingguan/nasional)', pendek: 'Hari pendek (6 hari kerja)' };
  const MULT_LABELS = {
    kerja1: 'Hari kerja: jam ke-1', kerja2: 'Hari kerja: jam ke-2 dst',
    libur1: 'Libur: jam 1–8', libur2: 'Libur: jam ke-9', libur3: 'Libur: jam ke-10 dst',
    pendek1: 'Hari pendek: jam 1–5', pendek2: 'Hari pendek: jam ke-6', pendek3: 'Hari pendek: jam ke-7 dst'
  };

  // Cadangan bila umk.json tidak bisa dimuat (mis. file dibuka langsung tanpa server).
  let cfg = {
    daerah: 'Kabupaten Jepara',
    umk: { 2022: 2108401, 2023: 2272626, 2024: 2450915, 2025: 2610224, 2026: 2756501 },
    bpjs: { kesehatanBatasUpah: 12000000, jpBatasUpah: 11086300 }
  };

  const freshState = () => ({
    gajiPokok: 0, umkYear: 'auto',
    tunjanganTetap: 0, tunjanganTidakTetap: 0, tunjanganHarian: 0, bonus: 0,
    hariSistem: 5, hariKerjaBulan: 21, alpa: 0, izin: 0,
    terlambatMode: 'menit', terlambatMenit: 0, terlambatKali: 0, terlambatNominal: 0,
    ipcMode: 'jam', ipcJam: 0, ipcKali: 0, ipcNominal: 0,
    kesOn: true, jhtOn: true, jpOn: true,
    divisor: 173, waktuBasis: 'pokok+tetap', bpjsBasis: 'pokok+tetap',
    capKes: 0, capJp: 0,
    lembur: [{ type: 'kerja', hours: 1, count: 1 }],
    potonganLain: [],
    mult: Object.assign({}, DEFAULT_MULT)
  });
  let S = freshState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved) S = Object.assign(freshState(), saved, { mult: Object.assign({}, DEFAULT_MULT, saved.mult) });
  } catch (e) { /* abaikan */ }
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) {} };

  // ---------- UMK ----------
  function currentUmk() {
    const thisYear = new Date().getFullYear();
    const want = S.umkYear === 'auto' ? thisYear : Number(S.umkYear);
    return Object.assign(umkForYear(cfg.umk, want), { want });
  }
  function renderUmkSelect() {
    const years = Object.keys(cfg.umk).sort((a, b) => b - a);
    $('umkYear').innerHTML = '<option value="auto">Otomatis (tahun berjalan)</option>' +
      years.map((y) => `<option value="${y}">${y} — ${rp(cfg.umk[y])}</option>`).join('');
    $('umkYear').value = S.umkYear;
  }
  function renderUmkHints() {
    const u = currentUmk();
    $('gajiPokok').placeholder = u.value ? fmtMoney(u.value) : 'Isi manual';
    $('umkHint').textContent = S.gajiPokok > 0
      ? 'Diisi manual. Kosongkan untuk memakai UMK.'
      : `Kosong → otomatis UMK ${cfg.daerah} ${u.yearUsed}: ${rp(u.value)}`;
    $('umkNote').textContent = u.exact ? '' : `UMK ${u.want} belum ada di data; memakai UMK ${u.yearUsed}.`;
    $('umkNote').style.color = u.exact ? '' : 'var(--warn)';
    $('dataInfo').textContent = `Sumber UMK: data ${cfg.daerah}${cfg.diperbarui ? ' (diperbarui ' + cfg.diperbarui + ')' : ''}. Selalu cocokkan dengan SK Gubernur Jawa Tengah dan aturan perusahaan Anda.`;
  }

  // ---------- Binding input sederhana ----------
  const MONEY = ['gajiPokok', 'tunjanganTetap', 'tunjanganTidakTetap', 'tunjanganHarian', 'bonus', 'terlambatNominal', 'ipcNominal', 'capKes', 'capJp'];
  const NUMS = ['hariKerjaBulan', 'alpa', 'izin', 'terlambatMenit', 'terlambatKali', 'ipcJam', 'ipcKali', 'divisor'];
  const SELECTS = ['terlambatMode', 'ipcMode', 'waktuBasis', 'bpjsBasis', 'hariSistem'];
  const dayTypes = () => (Number(S.hariSistem) === 5
    ? { kerja: DAY_TYPES.kerja, libur: DAY_TYPES.libur }
    : DAY_TYPES);
  const multKeys = () => Object.keys(MULT_LABELS).filter((k) => Number(S.hariSistem) !== 5 || !k.startsWith('pendek'));
  const CHECKS = ['kesOn', 'jhtOn', 'jpOn'];

  function syncInputs() {
    MONEY.forEach((k) => { if (k !== 'capKes' && k !== 'capJp') $(k).value = fmtMoney(S[k]); });
    $('capKes').value = fmtMoney(S.capKes || cfg.bpjs.kesehatanBatasUpah);
    $('capJp').value = fmtMoney(S.capJp || cfg.bpjs.jpBatasUpah);
    NUMS.forEach((k) => { $(k).value = S[k] || (k === 'hariKerjaBulan' || k === 'divisor' ? S[k] : ''); });
    SELECTS.forEach((k) => { $(k).value = S[k]; });
    CHECKS.forEach((k) => { $(k).checked = S[k]; });
    toggleVisibility();
  }
  function toggleVisibility() {
    document.querySelectorAll('[data-show]').forEach((el) => {
      const [id, val] = el.dataset.show.split('=');
      el.style.display = $(id).value === val ? '' : 'none';
    });
  }
  MONEY.forEach((k) => $(k).addEventListener('input', (e) => {
    const n = parseMoney(e.target.value);
    e.target.value = fmtMoney(n);
    S[k] = n; update();
  }));
  NUMS.forEach((k) => $(k).addEventListener('input', (e) => { S[k] = Number(e.target.value) || 0; update(); }));
  SELECTS.forEach((k) => $(k).addEventListener('change', (e) => {
    S[k] = k === 'hariSistem' ? Number(e.target.value) : e.target.value;
    if (k === 'hariSistem') {
      S.hariKerjaBulan = S.hariSistem === 5 ? 21 : 25;
      $('hariKerjaBulan').value = S.hariKerjaBulan;
      if (S.hariSistem === 5) S.lembur.forEach((r) => { if (r.type === 'pendek') r.type = 'kerja'; });
      renderLembur(); renderMult();
    }
    toggleVisibility(); update();
  }));
  CHECKS.forEach((k) => $(k).addEventListener('change', (e) => { S[k] = e.target.checked; update(); }));
  $('umkYear').addEventListener('change', (e) => { S.umkYear = e.target.value; update(); });
  $('useUmk').addEventListener('click', () => { S.gajiPokok = 0; $('gajiPokok').value = ''; update(); });

  // ---------- Baris lembur ----------
  function lemburRowHtml(row, i) {
    const custom = !HOURS.includes(row.hours);
    return `<div class="row" data-i="${i}">
      <select data-f="type" aria-label="Jenis hari">${Object.entries(dayTypes()).map(([v, t]) => `<option value="${v}"${row.type === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
      <select data-f="hoursSel" aria-label="Durasi lembur">${HOURS.map((h) => `<option value="${h}"${!custom && row.hours === h ? ' selected' : ''}>${String(h).replace('.', ',')} jam</option>`).join('')}<option value="custom"${custom ? ' selected' : ''}>Lainnya…</option></select>
      <input data-f="hoursCustom" type="number" min="0" step="0.5" value="${custom ? row.hours : ''}" placeholder="jam" style="display:${custom ? '' : 'none'}" aria-label="Jam lembur manual">
      <label class="inline"><input data-f="count" type="number" min="0" step="1" value="${row.count}" aria-label="Jumlah hari"> hari</label>
      <button type="button" class="x" data-del="${i}" aria-label="Hapus baris">×</button>
    </div>`;
  }
  function renderLembur() { $('lemburRows').innerHTML = S.lembur.map(lemburRowHtml).join('') || '<p class="hint">Belum ada lembur.</p>'; }
  $('addLembur').addEventListener('click', () => { S.lembur.push({ type: 'kerja', hours: 1, count: 1 }); renderLembur(); update(); });
  $('lemburRows').addEventListener('input', onLemburChange);
  $('lemburRows').addEventListener('change', onLemburChange);
  $('lemburRows').addEventListener('click', (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { S.lembur.splice(Number(d.dataset.del), 1); renderLembur(); update(); }
  });
  function onLemburChange(e) {
    const rowEl = e.target.closest('.row'); if (!rowEl) return;
    const row = S.lembur[Number(rowEl.dataset.i)]; const f = e.target.dataset.f;
    if (f === 'type') row.type = e.target.value;
    if (f === 'count') row.count = Number(e.target.value) || 0;
    if (f === 'hoursSel') {
      const cust = rowEl.querySelector('[data-f="hoursCustom"]');
      if (e.target.value === 'custom') { cust.style.display = ''; cust.focus(); row.hours = Number(cust.value) || 0; }
      else { cust.style.display = 'none'; row.hours = Number(e.target.value); }
    }
    if (f === 'hoursCustom') row.hours = Number(e.target.value) || 0;
    update();
  }

  // ---------- Potongan lain ----------
  function renderOther() {
    $('otherRows').innerHTML = S.potonganLain.map((p, i) => `<div class="row other" data-i="${i}">
      <input data-f="nama" value="${(p.nama || '').replace(/"/g, '&quot;')}" placeholder="Nama potongan (mis. kasbon)">
      <input data-f="nominal" class="money" inputmode="numeric" value="${fmtMoney(p.nominal)}" placeholder="Rp">
      <button type="button" class="x" data-del="${i}" aria-label="Hapus">×</button></div>`).join('');
  }
  $('addOther').addEventListener('click', () => { S.potonganLain.push({ nama: '', nominal: 0 }); renderOther(); update(); });
  $('otherRows').addEventListener('input', (e) => {
    const rowEl = e.target.closest('.row'); if (!rowEl) return;
    const p = S.potonganLain[Number(rowEl.dataset.i)];
    if (e.target.dataset.f === 'nama') p.nama = e.target.value;
    else { p.nominal = parseMoney(e.target.value); e.target.value = fmtMoney(p.nominal); }
    update();
  });
  $('otherRows').addEventListener('click', (e) => {
    const d = e.target.closest('[data-del]');
    if (d) { S.potonganLain.splice(Number(d.dataset.del), 1); renderOther(); update(); }
  });

  // ---------- Pengali ----------
  function renderMult() {
    $('multGrid').innerHTML = multKeys().map((k) =>
      `<label class="field"><span>${MULT_LABELS[k]}</span><input type="number" step="0.25" min="0" data-m="${k}" value="${S.mult[k]}"></label>`).join('');
  }
  $('multGrid').addEventListener('input', (e) => {
    const k = e.target.dataset.m; if (!k) return;
    S.mult[k] = Number(e.target.value) || 0; update();
  });
  $('resetMult').addEventListener('click', () => { S.mult = Object.assign({}, DEFAULT_MULT); renderMult(); update(); });

  // ---------- Hitung & tampilkan ----------
  function input() {
    const u = currentUmk();
    return Object.assign({}, S, {
      gajiPokok: S.gajiPokok > 0 ? S.gajiPokok : u.value,
      capKes: S.capKes || cfg.bpjs.kesehatanBatasUpah,
      capJp: S.capJp || cfg.bpjs.jpBatasUpah
    });
  }
  const line = (label, val, cls) => `<div class="line ${cls || ''}"><span>${label}</span><b>${rp(val)}</b></div>`;
  const jam = (h) => String(h).replace('.', ',');

  function render(R) {
    $('netPay').textContent = rp(R.bersih);
    $('netSub').textContent = `Pendapatan kotor ${rp(R.kotor)} − potongan ${rp(R.totalPotongan)} · upah/jam ${rp(R.upahJam)}`;

    let h = '<h3>Pendapatan</h3>';
    h += line('Gaji pokok', R.pokok);
    if (R.tetap) h += line('Tunjangan tetap', R.tetap);
    if (R.tidakTetap) h += line('Tunjangan tidak tetap', R.tidakTetap);
    if (R.tunjHarianTotal) h += line(`Uang makan/transport (${R.hariMasuk} hari)`, R.tunjHarianTotal);
    R.lemburRows.filter((x) => x.pay).forEach((x) => {
      h += line(`Lembur ${DAY_TYPES[x.type].split(' (')[0].toLowerCase()} ${jam(x.hours)} jam × ${x.count} hari`, x.pay, 'sub');
    });
    if (R.lembur) h += line('Total lembur', R.lembur);
    if (R.bonus) h += line('Bonus / insentif', R.bonus);
    h += line('Total pendapatan', R.kotor, 'total');

    h += '<h3>Potongan</h3>';
    const ded = [
      ['BPJS Kesehatan (1%)', R.bpjs.kesehatan], ['BPJS JHT (2%)', R.bpjs.jht], ['BPJS JP (1%)', R.bpjs.jp],
      [`Alpa (${S.alpa} hari)`, R.potAlpa], [`Izin tanpa upah (${S.izin} hari)`, R.potIzin],
      ['Terlambat', R.potTerlambat], ['IPC (izin pulang cepat)', R.potIpc]
    ].filter(([, v]) => v);
    ded.forEach(([l, v]) => { h += line(l, -v); });
    R.lainnya.filter((x) => x.nominal).forEach((x) => { h += line(x.nama, -x.nominal); });
    if (!ded.length && !R.potLain) h += '<p class="hint">Tidak ada potongan.</p>';
    h += line('Total potongan', -R.totalPotongan, 'total');
    $('breakdown').innerHTML = h;

    // Tabel cepat tarif lembur per durasi
    const six = Number(S.hariSistem) !== 5;
    let t = `<table><thead><tr><th>Durasi</th><th>Hari kerja</th><th>Hari libur</th>${six ? '<th>Hari pendek</th>' : ''}</tr></thead><tbody>`;
    HOURS.forEach((hh) => {
      const cell = (type) => rp(Math.round(R.upahJam * weightedHours(hh, type, S.mult)));
      t += `<tr><td>${jam(hh)} jam</td><td>${cell('kerja')}</td><td>${cell('libur')}</td>${six ? `<td>${cell('pendek')}</td>` : ''}</tr>`;
    });
    $('quickTable').innerHTML = t + `</tbody></table><p class="hint">Upah per jam saat ini ${rp(R.upahJam)} (dasar ${rp(R.waktuBase)} ÷ ${S.divisor || 173}).</p>`;
  }

  let last;
  function update() { last = compute(input()); render(last); renderUmkHints(); save(); }

  // ---------- Aksi ----------
  $('copyBtn').addEventListener('click', async () => {
    const R = last;
    const txt = [`Simulasi gaji — ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
      `Gaji pokok: ${rp(R.pokok)}`, `Lembur: ${rp(R.lembur)}`, `Pendapatan kotor: ${rp(R.kotor)}`,
      `Potongan BPJS: ${rp(R.bpjs.kesehatan + R.bpjs.jht + R.bpjs.jp)}`,
      `Potongan absensi/IPC/terlambat: ${rp(R.potAlpa + R.potIzin + R.potTerlambat + R.potIpc)}`,
      `Potongan lain: ${rp(R.potLain)}`, `Gaji bersih: ${rp(R.bersih)}`].join('\n');
    try { await navigator.clipboard.writeText(txt); $('copyBtn').textContent = 'Tersalin ✓'; }
    catch (e) { $('copyBtn').textContent = 'Gagal menyalin'; }
    setTimeout(() => { $('copyBtn').textContent = 'Salin ringkasan'; }, 1800);
  });
  $('printBtn').addEventListener('click', () => window.print());
  $('resetBtn').addEventListener('click', () => {
    if (!confirm('Reset semua isian?')) return;
    S = freshState(); syncInputs(); renderUmkSelect(); renderLembur(); renderOther(); renderMult(); update();
  });

  // ---------- Mulai ----------
  function boot() {
    renderUmkSelect(); syncInputs(); renderLembur(); renderOther(); renderMult(); update();
  }
  boot();
  fetch('umk.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((j) => { cfg = Object.assign(cfg, j); boot(); })
    .catch(() => { /* pakai data cadangan di atas */ });
})();
