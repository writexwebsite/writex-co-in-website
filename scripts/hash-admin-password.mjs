import bcrypt from "bcryptjs";

const allowedRoles = new Set([
  "super_admin",
  "sales",
  "support",
  "accounts",
  "viewer"
]);

const [password, email = "admin@writex.co.in", name = "WriteX Admin", role = "super_admin"] =
  process.argv.slice(2);

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

if (!password || password.length < 14) {
  console.error("Usage: pnpm admin:hash-password \"Strong password\" [email] [name] [role]");
  console.error("Password must be at least 14 characters.");
  process.exit(1);
}

if (!allowedRoles.has(role)) {
  console.error(`Role must be one of: ${Array.from(allowedRoles).join(", ")}`);
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);

console.log("Bcrypt password hash:");
console.log(hash);
console.log("");
console.log("SQL insert/update:");
console.log(`insert into admin_users (name, email, password_hash, role, is_active, must_change_password)
values ('${escapeSql(name)}', '${escapeSql(email)}', '${escapeSql(hash)}', '${escapeSql(role)}', true, true)
on conflict (email) do update
set password_hash = excluded.password_hash,
    role = excluded.role,
    is_active = true,
    must_change_password = true,
    password_changed_at = null,
    updated_at = now();`);
