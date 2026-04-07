const { toNumber } = require('./parsers.js');

console.log('Testing toNumber:');
console.log('helisa:', toNumber('$616,850.00'));
console.log('banco:', toNumber('$616,850.00'));

const helisaStr = "19/02/2026 INCAPACIDA RC 00001137 800,130,907-. SALUD TOTAL S.A	$616,850.00";
const bancoStr = "19/02/2026 Salud Total Incapacida	$616,850.00";

const helisaParts = helisaStr.split('\t');
const bancoParts = bancoStr.split('\t');

console.log('Helisa Amount:', toNumber(helisaParts[helisaParts.length - 1]));
console.log('Banco Amount:', toNumber(bancoParts[bancoParts.length - 1]));

const { daysDiff } = require('./reconciler.js');
console.log('daysDiff:', daysDiff('2026-02-19', '2026-02-19'));

