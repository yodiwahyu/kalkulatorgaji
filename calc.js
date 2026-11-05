/* Logika perhitungan gaji — murni (tanpa DOM) supaya bisa dites di Node dan dipakai di browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GajiCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Pengali lembur default sesuai Kepmenaker 102/MEN/VI/2004.
  const DEFAULT_MULT = {
    kerja1: 1.5, kerja2: 2,                 // hari kerja: jam ke-1 = 1,5x ; jam ke-2 dst = 2x
    libur1: 2, libur2: 3, libur3: 4,        // hari libur: jam 1-8 = 2x ; jam ke-9 = 3x ; jam ke-10 dst = 4x
    pendek1: 2, pendek2: 3, pendek3: 4      // hari pendek (6 hari kerja): jam 1-5 = 2x ; jam ke-6 = 3x ; jam ke-7 dst = 4x
  };

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  /** Jumlah "jam setara" setelah dikalikan pengali bertingkat. Mendukung pecahan jam (0,5 dst). */
  function weightedHours(hours, type, mult) {
    const m = Object.assign({}, DEFAULT_MULT, mult || {});
    const tiers = {
      kerja: [[1, m.kerja1], [Infinity, m.kerja2]],
      libur: [[8, m.libur1], [9, m.libur2], [Infinity, m.libur3]],
      pendek: [[5, m.pendek1], [6, m.pendek2], [Infinity, m.pendek3]]
    }[type] || [[Infinity, 1]];
    let prev = 0, total = 0;
    const h = num(hours);
    for (const [upto, mul] of tiers) {
      const seg = Math.max(0, Math.min(h, upto) - prev);
      total += seg * mul;
      prev = upto;
      if (h <= upto) break;
    }
    return total;
  }

  /** Cari UMK untuk tahun tertentu; kalau belum ada, pakai tahun terbaru yang tersedia. */
  function umkForYear(table, year) {
    const years = Object.keys(table || {}).map(Number).filter(Boolean).sort((a, b) => a - b);
    if (!years.length) return { value: 0, yearUsed: null, exact: false };
    if (table[year]) return { value: Number(table[year]), yearUsed: Number(year), exact: true };
    const earlier = years.filter((y) => y <= year);
    const used = earlier.length ? earlier[earlier.length - 1] : years[0];
    return { value: Number(table[used]), yearUsed: used, exact: false };
  }

  function compute(inp) {
    const r = Math.round;
    const pokok = num(inp.gajiPokok);
    const tetap = num(inp.tunjanganTetap);
    const tidakTetap = num(inp.tunjanganTidakTetap);
    const harian = num(inp.tunjanganHarian);
    const bonus = num(inp.bonus);
    const hariKerja = num(inp.hariKerjaBulan) || 25;
    const divisor = num(inp.divisor) || 173;

    const waktuBase = inp.waktuBasis === 'pokok' ? pokok : pokok + tetap;   // dasar lembur & potongan jam/hari
    const bpjsBase = inp.bpjsBasis === 'pokok' ? pokok : pokok + tetap;     // dasar iuran BPJS
    const upahJam = waktuBase / divisor;
    const upahHari = waktuBase / hariKerja;

    // ---- Lembur ----
    const lemburRows = (inp.lembur || []).map((e) => {
      const hours = num(e.hours), count = num(e.count);
      const weighted = weightedHours(hours, e.type, inp.mult);
      return { type: e.type, hours, count, weighted, pay: r(upahJam * weighted * count) };
    });
    const lembur = lemburRows.reduce((s, x) => s + x.pay, 0);

    // ---- Kehadiran ----
    const alpa = num(inp.alpa), izin = num(inp.izin);
    const hariMasuk = Math.max(0, hariKerja - alpa - izin);
    const tunjHarianTotal = r(harian * hariMasuk);

    // ---- Pendapatan ----
    const kotor = pokok + tetap + tidakTetap + tunjHarianTotal + lembur + bonus;

    // ---- Potongan ----
    const bpjs = {
      kesehatan: inp.kesOn ? r(Math.min(bpjsBase, num(inp.capKes) || Infinity) * 0.01) : 0,
      jht: inp.jhtOn ? r(bpjsBase * 0.02) : 0,
      jp: inp.jpOn ? r(Math.min(bpjsBase, num(inp.capJp) || Infinity) * 0.01) : 0
    };
    const potAlpa = r(upahHari * alpa);
    const potIzin = r(upahHari * izin);
    const potTerlambat = inp.terlambatMode === 'kali'
      ? r(num(inp.terlambatKali) * num(inp.terlambatNominal))
      : r((num(inp.terlambatMenit) / 60) * upahJam);
    const potIpc = inp.ipcMode === 'kali'
      ? r(num(inp.ipcKali) * num(inp.ipcNominal))
      : r(num(inp.ipcJam) * upahJam);
    const lainnya = (inp.potonganLain || []).map((p) => ({ nama: p.nama || 'Potongan lain', nominal: r(num(p.nominal)) }));
    const potLain = lainnya.reduce((s, x) => s + x.nominal, 0);

    const totalPotongan = bpjs.kesehatan + bpjs.jht + bpjs.jp + potAlpa + potIzin + potTerlambat + potIpc + potLain;
    const bersih = kotor - totalPotongan;

    return {
      pokok, tetap, tidakTetap, tunjHarianTotal, hariMasuk, lembur, lemburRows, bonus, kotor,
      bpjs, potAlpa, potIzin, potTerlambat, potIpc, lainnya, potLain, totalPotongan, bersih,
      upahJam, upahHari, waktuBase, bpjsBase
    };
  }

  return { DEFAULT_MULT, weightedHours, umkForYear, compute };
});
