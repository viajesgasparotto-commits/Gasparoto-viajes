// Prueba de la lógica de reservas (fase 2) contra SQLite real: sobreventa, vencimiento, estados.
// Uso: npm run test:reservas   (necesita Node 22+ por node:sqlite; no usa la red ni Cloudflare)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { ensureSchema } from "../functions/lib/schema.js";
import { createBooking, checkKidsPolicy, kidsPolicy, setBookingStatus, expireHolds, monthState, addDays, todayBA, holdMinutes } from "../functions/lib/booking.js";

// Adaptador mínimo con la forma de D1
function d1(path = ":memory:") {
  const db = new DatabaseSync(path);
  const mk = (sql, args = []) => ({
    bind: (...a) => mk(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (s) => mk(s), batch: async (l) => { for (const x of l) await x.run(); return []; }, _raw: db };
}

const db = d1();
await ensureSchema(db);
await db.prepare("INSERT INTO packages (slug,title,category,price,booking_enabled,min_pax,max_pax,daily_capacity,weekdays,min_advance_days,horizon_days,published) VALUES ('tango','Tango','tangos','R$ 1.234,50',1,1,6,10,'0,1,2,3,4,5,6',1,60,1)").run();
const p = await db.prepare("SELECT * FROM packages WHERE slug='tango'").first();
const env = {};
const day = addDays(todayBA(), 5);
const base = { day, name: "Ana", phone: "+54 9 11 5555 1234", message: "" };

// 1) reserva válida
let r = await createBooking(db, env, p, { ...base, pax: 4 });
assert.ok(r.ok, JSON.stringify(r)); assert.equal(r.total, 123450 * 4); assert.equal(r.currency, "BRL");
assert.ok(r.expires_in > 19 * 60 && r.expires_in <= 20 * 60, "retención ~20 min, fue " + r.expires_in);
console.log("✓ crea pendiente, total en centavos =", r.total, "retención", r.expires_in, "s");

// 2) el cupo bajó (10 - 4 = 6) y la ficha lo ve
let st = await monthState(db, p, day.slice(0, 7));
assert.equal(st.days.find((x) => x.day === day).left, 6);
console.log("✓ monthState descuenta la retención: quedan 6");

// 3) carrera: dos pedidos de 4 personas con 6 lugares → solo uno entra
const [a, b] = await Promise.all([createBooking(db, env, p, { ...base, pax: 4, phone: "111111" }), createBooking(db, env, p, { ...base, pax: 4, phone: "222222" })]);
assert.equal([a, b].filter((x) => x.ok).length, 1, "solo uno debe entrar"); 
console.log("✓ sin sobreventa:", a.ok ? "A entró" : "B entró", "/ el otro →", (a.ok ? b : a).code);
// 6 - 4 = 2 lugares
r = await createBooking(db, env, p, { ...base, pax: 3, phone: "333333" });
assert.equal(r.code, "full");
r = await createBooking(db, env, p, { ...base, pax: 2, phone: "444444" });
assert.ok(r.ok); console.log("✓ rechaza 3 (quedan 2) y acepta 2 → día completo");
st = await monthState(db, p, day.slice(0, 7));
assert.equal(st.days.find((x) => x.day === day).st, "full");

// 4) vencimiento: se libera el cupo
db._raw.prepare("UPDATE bookings SET hold_until=datetime('now','-1 minutes') WHERE status='pendiente'").run();
st = await monthState(db, p, day.slice(0, 7));
assert.equal(st.days.find((x) => x.day === day).left, 10, "vencidas no ocupan cupo ni antes de marcarlas");
await expireHolds(db);
assert.equal((await db.prepare("SELECT COUNT(*) n FROM bookings WHERE status='vencida'").first()).n, 3);
console.log("✓ retención vencida libera el cupo y pasa a 'vencida'");

// 5) validaciones
assert.equal((await createBooking(db, env, p, { ...base, pax: 7 })).code, "pax");
assert.equal((await createBooking(db, env, p, { ...base, pax: 0 })).code, "pax");
assert.equal((await createBooking(db, env, p, { ...base, day: todayBA(), pax: 2 })).code, "unavailable"); // anticipación mínima 1
assert.equal((await createBooking(db, env, p, { ...base, day: "2020-01-01", pax: 2 })).code, "unavailable");
assert.equal((await createBooking(db, env, p, { ...base, pax: 2, name: "" })).code, "data");
assert.equal((await createBooking(db, env, p, { ...base, pax: 2, phone: "12" })).code, "data");
await db.prepare("INSERT INTO availability (package_id, day, closed) VALUES (?,?,1)").bind(p.id, addDays(day, 1)).run();
assert.equal((await createBooking(db, env, p, { ...base, day: addDays(day, 1), pax: 2 })).code, "unavailable");
console.log("✓ valida personas, fechas pasadas/cerradas/anticipación y datos");

// 6) cupo propio del día (excepción) respetado por el INSERT atómico
const d2 = addDays(day, 2);
await db.prepare("INSERT INTO availability (package_id, day, closed, capacity) VALUES (?,?,0,3)").bind(p.id, d2).run();
assert.equal((await createBooking(db, env, p, { ...base, day: d2, pax: 4 })).code, "full");
assert.ok((await createBooking(db, env, p, { ...base, day: d2, pax: 3 })).ok);
console.log("✓ respeta el cupo propio del día (3)");

// 7) tope por teléfono
const d3 = addDays(day, 3);
for (let i = 0; i < 3; i++) assert.ok((await createBooking(db, env, p, { ...base, day: d3, pax: 1, phone: "999999" })).ok);
assert.equal((await createBooking(db, env, p, { ...base, day: d3, pax: 1, phone: "999999" })).code, "limit");
console.log("✓ máximo 3 retenciones vigentes por teléfono");

// 8) panel: pagar / cancelar / reactivar con control de cupo
const d4 = addDays(day, 4);
const x1 = await createBooking(db, env, p, { ...base, day: d4, pax: 6, phone: "555551" });
assert.ok(x1.ok);
db._raw.prepare("UPDATE bookings SET hold_until=datetime('now','-1 minutes') WHERE id=?").run(x1.id); await expireHolds(db);
const x2 = await createBooking(db, env, p, { ...base, day: d4, pax: 6, phone: "555552" }); assert.ok(x2.ok); // ocupa lo que dejó la vencida
let s = await setBookingStatus(db, env, x1.id, "pagada");
assert.equal(s.status, 409, "no se puede pagar una vencida si el lugar fue tomado: " + JSON.stringify(s));
assert.equal((await setBookingStatus(db, env, x2.id, "pagada")).ok, true);
assert.equal((await db.prepare("SELECT status, hold_until FROM bookings WHERE id=?").bind(x2.id).first()).status, "pagada");
st = await monthState(db, p, d4.slice(0, 7)); assert.equal(st.days.find((x) => x.day === d4).left, 4);
assert.equal((await setBookingStatus(db, env, x2.id, "cancelada")).ok, true);
st = await monthState(db, p, d4.slice(0, 7)); assert.equal(st.days.find((x) => x.day === d4).left, 10);
assert.equal((await setBookingStatus(db, env, x1.id, "pendiente")).ok, true, "reactivar con lugar libre");
assert.equal((await setBookingStatus(db, env, 99999, "pagada")).status, 404);
console.log("✓ pagar/cancelar/reactivar: revisa cupo, libera al cancelar, 409 si el lugar ya no está");

// 9) horas de retención
assert.equal(holdMinutes({}), 20); assert.equal(holdMinutes({ BOOKING_HOLD_MINUTES: "5" }), 15);
assert.equal(holdMinutes({ BOOKING_HOLD_MINUTES: "99" }), 30); assert.equal(holdMinutes({ BOOKING_HOLD_MINUTES: "25" }), 25); assert.equal(holdMinutes({ BOOKING_HOLD_MINUTES: "" }), 20);
console.log("✓ retención limitada a 15–30 min (por defecto 20)");

// 10) adultos y niños: solo si el paquete acepta niños; el cupo y el total cuentan personas (adultos + niños)
await db.prepare("INSERT INTO packages (slug,title,category,price,booking_enabled,min_pax,max_pax,daily_capacity,weekdays,min_advance_days,horizon_days,published,accepts_children) VALUES ('tigre','Tigre','tangos','R$ 100',1,1,6,10,'0,1,2,3,4,5,6',1,60,1,1)").run();
const pk = await db.prepare("SELECT * FROM packages WHERE slug='tigre'").first();
const dk = addDays(todayBA(), 9), bk = { day: dk, name: "Ana", phone: "+54 9 11 5555 1234", message: "" };
let k = await createBooking(db, env, pk, { ...bk, pax: 3, adults: 2, children: 1 });
assert.ok(k.ok, JSON.stringify(k)); assert.equal(k.adults, 2); assert.equal(k.children, 1); assert.equal(k.total, 10000 * 3);
let row = await db.prepare("SELECT adults, children, pax FROM bookings WHERE id=?").bind(k.id).first();
assert.deepEqual([row.adults, row.children, row.pax], [2, 1, 3]);
assert.equal((await createBooking(db, env, pk, { ...bk, pax: 3, adults: 0, children: 3 })).code, "pax", "al menos 1 adulto");
assert.equal((await createBooking(db, env, pk, { ...bk, pax: 3, adults: 1, children: 1 })).code, "pax", "adultos + niños deben sumar el total");
k = await createBooking(db, env, pk, { ...bk, pax: 2 }); // sin desglose (cliente viejo): todos adultos
assert.ok(k.ok); assert.equal(k.adults, 2); assert.equal(k.children, 0);
st = await monthState(db, pk, dk.slice(0, 7)); assert.equal(st.days.find((x) => x.day === dk).left, 5, "los niños ocupan lugar");
// un paquete que NO acepta niños ignora los niños que lleguen
const nk = await createBooking(db, env, p, { ...base, phone: "+54 9 11 4444 0000", day: addDays(todayBA(), 11), pax: 3, adults: 1, children: 2 });
assert.ok(nk.ok); assert.equal(nk.adults, 3); assert.equal(nk.children, 0);
console.log("✓ adultos y niños: validación, cupo por personas y paquetes que no aceptan niños");

// 11) precio de niños por edad: 0–5 gratis, 6–11 al 50 %, 12 en adelante paga como adulto
const tiers = checkKidsPolicy({ tiers: [{ from: 6, to: 11, pct: 50 }, { from: 0, to: 5, pct: 0 }] });
assert.deepEqual(tiers.tiers, [{ from: 0, to: 5, pct: 0 }, { from: 6, to: 11, pct: 50 }], "ordena los tramos");
assert.ok(checkKidsPolicy({ tiers: [{ from: 0, to: 6, pct: 0 }, { from: 6, to: 9, pct: 50 }] }).error, "tramos superpuestos");
assert.ok(checkKidsPolicy({ tiers: [{ from: 8, to: 3, pct: 0 }] }).error, "desde > hasta");
assert.ok(checkKidsPolicy({ tiers: [{ from: 0, to: 5, pct: 150 }] }).error, "porcentaje > 100");
assert.ok(checkKidsPolicy({ tiers: [{ from: 0, to: 20, pct: 0 }] }).error, "edad > 17");
await db.prepare("UPDATE packages SET kids_policy=? WHERE id=?").bind(JSON.stringify({ tiers: tiers.tiers }), pk.id).run();
const pkk = await db.prepare("SELECT * FROM packages WHERE id=?").bind(pk.id).first();
assert.equal(kidsPolicy(pkk).tiers.length, 2);
const dg = addDays(todayBA(), 13), gk = { day: dg, name: "Ana", phone: "+54 9 11 5555 9999", message: "" };
assert.equal((await createBooking(db, env, pkk, { ...gk, pax: 3, adults: 2, children: 1 })).code, "pax", "falta la edad del niño");
assert.equal((await createBooking(db, env, pkk, { ...gk, pax: 3, adults: 2, children: 1, ages: [30] })).code, "pax", "edad fuera de rango");
k = await createBooking(db, env, pkk, { ...gk, pax: 5, adults: 2, children: 3, ages: [3, 8, 14] });
assert.ok(k.ok, JSON.stringify(k)); assert.equal(k.total, 10000 * 2 + 0 + 5000 + 10000, "2 adultos + gratis + 50 % + adulto");
row = await db.prepare("SELECT child_ages, total FROM bookings WHERE id=?").bind(k.id).first();
assert.equal(row.child_ages, "3,8,14");
k = await createBooking(db, env, pkk, { ...gk, phone: "+54 9 11 5555 8888", pax: 2, adults: 2, children: 0 });
assert.ok(k.ok); assert.equal(k.total, 20000, "sin niños no pide edades");
st = await monthState(db, pkk, dg.slice(0, 7)); assert.equal(st.days.find((x) => x.day === dg).left, 3, "los niños gratis también ocupan lugar");
// sin tramos configurados: los niños pagan completo y no hace falta la edad
k = await createBooking(db, env, pk, { ...bk, phone: "+54 9 11 5555 7777", day: addDays(todayBA(), 15), pax: 3, adults: 2, children: 1 });
assert.ok(k.ok); assert.equal(k.total, 30000);
console.log("✓ niños por edad: tramos validados, total por tramo, edades guardadas y cupo por persona");

console.log("\nTODO OK (lógica)");
