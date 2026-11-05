// Jalankan: node test.js
const assert = require('assert');
const { compute, weightedHours, umkForYear } = require('./calc.js');
const umk = require('./umk.json');

// Pengali lembur bertingkat
assert.strictEqual(weightedHours(0.5, 'kerja'), 0.75);
assert.strictEqual(weightedHours(1, 'kerja'), 1.5);
assert.strictEqual(weightedHours(2, 'kerja'), 3.5);
assert.strictEqual(weightedHours(3, 'kerja'), 5.5);
assert.strictEqual(weightedHours(3, 'libur'), 6);
assert.strictEqual(weightedHours(9, 'libur'), 19);
assert.strictEqual(weightedHours(10, 'libur'), 23);
assert.strictEqual(weightedHours(6, 'pendek'), 13);

// UMK per tahun + fallback tahun yang belum ada
assert.strictEqual(umkForYear(umk.umk, 2026).value, 2756501);
const f = umkForYear(umk.umk, 2027);
assert.strictEqual(f.value, 2756501);
assert.strictEqual(f.exact, false);
assert.strictEqual(f.yearUsed, 2026);

// Skenario lengkap
const R = compute({
  gajiPokok: 2756501, tunjanganTetap: 0, hariKerjaBulan: 25, divisor: 173,
  lembur: [{ type: 'kerja', hours: 2, count: 10 }, { type: 'libur', hours: 3, count: 2 }],
  kesOn: true, jhtOn: true, jpOn: true, capKes: 12000000, capJp: 11086300,
  alpa: 1, ipcJam: 2, ipcMode: 'jam', terlambatMode: 'menit', terlambatMenit: 30,
  potonganLain: [{ nama: 'Kasbon', nominal: 100000 }]
});
const jam = 2756501 / 173;
assert.strictEqual(R.lembur, Math.round(jam * 3.5 * 10) + Math.round(jam * 6 * 2));
assert.strictEqual(R.bpjs.kesehatan, Math.round(2756501 * 0.01));
assert.strictEqual(R.bpjs.jht, Math.round(2756501 * 0.02));
assert.strictEqual(R.bpjs.jp, Math.round(2756501 * 0.01));
assert.strictEqual(R.potAlpa, Math.round(2756501 / 25));
assert.strictEqual(R.potIpc, Math.round(2 * jam));
assert.strictEqual(R.potTerlambat, Math.round(0.5 * jam));
assert.strictEqual(R.bersih, R.kotor - R.totalPotongan);

// Batas upah BPJS
const hi = compute({ gajiPokok: 20000000, kesOn: true, jpOn: true, capKes: 12000000, capJp: 11086300 });
assert.strictEqual(hi.bpjs.kesehatan, 120000);
assert.strictEqual(hi.bpjs.jp, 110863);

console.log('Semua tes lulus.');
console.log({ upahJam: Math.round(jam), lembur: R.lembur, kotor: R.kotor, potongan: R.totalPotongan, bersih: R.bersih });
