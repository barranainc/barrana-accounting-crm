import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({
    select: { email: true, role: true, status: true, passwordHash: true }
  });
  
  for (const u of users) {
    const testPassword = await bcrypt.compare('Demo1234!', u.passwordHash || '');
    console.log(`${u.email} | ${u.role} | ${u.status} | hash:${u.passwordHash ? 'YES' : 'NO'} | password_valid:${testPassword}`);
  }
  
  await db["$disconnect"]();
}

main().catch(e => { console.error(e); process.exit(1); });
