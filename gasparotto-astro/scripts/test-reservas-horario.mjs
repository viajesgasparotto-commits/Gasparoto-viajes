// Reserva por horario (parte B del motor): el cupo vale por horario, sin sobreventa, compatible con reservas viejas.
// Uso: npm run test:reservas-horario   (Node 22+ por node:sqlite)
import { DatabaseSync } from "node:sqlite";
import assert from "node:assert/strict";
import { ensureSchema } from "../functions/lib/schema.js";
import { normMeta } from "../functions/lib/ficha.js";
import { createBooking, setBookingStatus, monthState, bookingConfig, addDays, todayBA, nowTimeBA } from "../functions/lib/booking.js";

function d1() {
  const db = new DatabaseSync(":memory:");
  const mk = (sql, args = []) => ({
    bind: (...a) => mk(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: (s) => mk(s), batch: async (l) => { for (const x of l) await x.run(); return []; }, _raw: db };
}
const db = d1(); await ensureSchema(db);
const add = async (slug, { meta, tb = 1, adv = 1, cap = 10 } = {}) => {
  await db.prepare("INSERT INTO packages (slug,title,category,price,meta,time_booking,booking_enabled,min_pax,max_pax,daily_capacity,weekdays,min_advance_days,horizon_days,published) VALUES (?,?,?,?,?,?,1,1,6,?,'0,1,2,3,4,5,6',?,60,1)")
    .bind(slug, slug, "tangos", "R$ 100,00", meta ?? normMeta({ times: [["09:00"], ["14:30"]] }), tb, cap, adv).run();
  return db.prepare("SELECT * FROM packages WHERE slug=?").bind(slug).first();
};
const p = await add("tigre");
const env = {}, day = addDays(todayBA(), 5), month = day.slice(0, 7);
const base = { day, name: "Ana", phone: "+54 9 11 5555 1234", message: "" };
const slotsOf = async (pk, d = day) => (await monthState(db, pk, d.slice(0, 7))).days.find((x) => x.day === d);

// 1) configuración
const cfg = bookingConfig(p);
assert.deepEqual(cfg.times, ["09:00", "14:30"]); assert.equal(cfg.byTime, true);
assert.equal(bookingConfig({ ...p, time_booking: 0 }).byTime, false, "apagado → por día");
assert.equal(bookingConfig({ ...p, meta: "{}" }).byTime, false, "prendido pero sin horarios → por día");
console.log("✓ config: byTime solo si está prendido y hay horarios");

// 2) el horario es obligatorio y debe ser uno de la ficha
assert.equal((await createBooking(db, env, p, { ...base, pax: 2 })).code, "time");
assert.equal((await createBooking(db, env, p, { ...base, pax: 2, time: "10:00" })).code, "time");
assert.equal((await createBooking(db, env, p, { ...base, pax: 2, time: "basura" })).code, "time");
console.log("✓ sin horario o con un horario inventado → code 'time'");

// 3) cupo independiente por horario
let r = await createBooking(db, env, p, { ...base, pax: 6, time: "9:00" }); // acepta "9:00" y lo normaliza
assert.ok(r.ok, JSON.stringify(r)); assert.equal(r.time, "09:00");
assert.equal((await db.prepare("SELECT time FROM bookings WHERE id=?").bind(r.id).first()).time, "09:00");
let d = await slotsOf(p);
assert.deepEqual(d.slots.map((s) => [s.t, s.left, s.st]), [["09:00", 4, "open"], ["14:30", 10, "open"]]);
assert.equal(d.left, 10, "left del día = el mejor horario"); assert.equal(d.st, "open");
r = await createBooking(db, env, p, { ...base, pax: 6, time: "14:30", phone: "222222" });
assert.ok(r.ok, "el otro horario tiene su propio cupo");
r = await createBooking(db, env, p, { ...base, pax: 5, time: "09:00", phone: "333333" });
assert.equal(r.code, "full"); assert.equal(r.left, 4);
console.log("✓ cada horario tiene su cupo (10 por horario) y el rechazo informa cuántos quedan");

// 4) carrera: dos pedidos de 4 con 4 lugares en el mismo horario → entra uno
const [a, b] = await Promise.all([createBooking(db, env, p, { ...base, pax: 4, time: "09:00", phone: "444444" }), createBooking(db, env, p, { ...base, pax: 4, time: "09:00", phone: "555555" })]);
assert.equal([a, b].filter((x) => x.ok).length, 1); console.log("✓ sin sobreventa por horario (carrera)");

// 5) día completo cuando se llenan todos los horarios
d = await slotsOf(p); assert.equal(d.slots[0].st, "full"); assert.equal(d.st, "open", "14:30 aún tiene lugar (4)");
r = await createBooking(db, env, p, { ...base, pax: 4, time: "14:30", phone: "666666" }); assert.ok(r.ok);
d = await slotsOf(p); assert.equal(d.st, "full"); assert.equal(d.left, 0);
console.log("✓ el día pasa a 'full' solo cuando ningún horario tiene lugar");

// 6) cupo propio del día = por horario
const day2 = addDays(day, 1);
await db.prepare("INSERT INTO availability (package_id, day, closed, capacity) VALUES (?,?,0,3)").bind(p.id, day2).run();
assert.ok((await createBooking(db, env, p, { ...base, day: day2, pax: 3, time: "09:00" })).ok);
assert.equal((await createBooking(db, env, p, { ...base, day: day2, pax: 1, time: "09:00", phone: "777777" })).code, "full");
assert.ok((await createBooking(db, env, p, { ...base, day: day2, pax: 3, time: "14:30", phone: "888888" })).ok);
console.log("✓ el cupo propio de un día aplica a cada horario");

// 7) día cerrado cierra todos los horarios
const day3 = addDays(day, 2);
await db.prepare("INSERT INTO availability (package_id, day, closed) VALUES (?,?,1)").bind(p.id, day3).run();
assert.equal((await createBooking(db, env, p, { ...base, day: day3, pax: 1, time: "09:00" })).code, "unavailable");
console.log("✓ día cerrado → ningún horario se vende");

// 8) reservas viejas sin hora cuentan contra todos los horarios
const day4 = addDays(day, 3);
await db.prepare("INSERT INTO bookings (package_id, day, time, pax, name, phone, status) VALUES (?,?,'',4,'Vieja','111','pagada')").bind(p.id, day4).run();
d = await slotsOf(p, day4); assert.deepEqual(d.slots.map((s) => s.left), [6, 6]);
assert.equal((await createBooking(db, env, p, { ...base, day: day4, pax: 6, time: "09:00" })).ok, true);
assert.equal((await createBooking(db, env, p, { ...base, day: day4, pax: 1, time: "09:00", phone: "999999" })).code, "full");
console.log("✓ reservas anteriores sin hora ocupan cupo en todos los horarios (cero sobreventa)");

// 9) panel: cancelar y reactivar respeta el cupo del horario
const day5 = addDays(day, 4);
const x1 = await createBooking(db, env, p, { ...base, day: day5, pax: 6, time: "09:00", phone: "121212" });
assert.deepEqual(await setBookingStatus(db, env, x1.id, "cancelada"), { ok: true });
const x2 = await createBooking(db, env, p, { ...base, day: day5, pax: 6, time: "09:00", phone: "131313" });
assert.ok(x2.ok);
const re = await setBookingStatus(db, env, x1.id, "pagada");
assert.equal(re.status, 409); assert.ok(re.error.includes("a las 09:00"), re.error);
const x3 = await createBooking(db, env, p, { ...base, day: day5, pax: 6, time: "14:30", phone: "141414" });
assert.deepEqual(await setBookingStatus(db, env, x3.id, "pagada"), { ok: true });
console.log("✓ reactivar: bloquea si el horario se llenó (el mensaje dice la hora) y deja pasar otro horario");

// 10) sin horarios cargados o apagado → comportamiento por día de siempre (la hora se ignora)
const pNo = await add("sinhorarios", { meta: "{}" }), pOff = await add("apagado", { tb: 0 });
for (const [i, pk] of [pNo, pOff].entries()) {
  r = await createBooking(db, env, pk, { ...base, pax: 4, time: "09:00", phone: "16161" + i }); assert.ok(r.ok, JSON.stringify(r)); assert.equal(r.time, "");
  assert.equal((await db.prepare("SELECT time FROM bookings WHERE id=?").bind(r.id).first()).time, "");
  assert.deepEqual((await slotsOf(pk)).slots, []);
  assert.equal((await slotsOf(pk)).left, 6);
}
console.log("✓ apagado o sin horarios: se reserva por día, sin cambios");

// 11) hoy: un horario que ya salió no se vende (anticipación 0)
const pHoy = await add("hoy", { meta: normMeta({ times: [["00:00"], ["23:59"]] }), adv: 0 });
const hoy = todayBA();
if (nowTimeBA() > "00:00") assert.equal((await createBooking(db, env, pHoy, { ...base, day: hoy, pax: 1, time: "00:00" })).code, "unavailable");
if (nowTimeBA() < "23:59") assert.ok((await createBooking(db, env, pHoy, { ...base, day: hoy, pax: 1, time: "23:59", phone: "151515" })).ok);
console.log("✓ hoy: se bloquean los horarios que ya pasaron");

console.log("\nReserva por horario: todo OK");
