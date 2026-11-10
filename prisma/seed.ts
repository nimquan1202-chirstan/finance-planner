import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { ROWS, WISHLIST } from './seed-data';

const EMAIL = 'demo@phy10615.vn';

async function main() {
  await prisma.user.deleteMany({
    where: { email: EMAIL },
  });
  const { id: userId } = await prisma.user.create({
    data: { email: EMAIL, name: 'Sinh viên demo' },
  });
  await prisma.transaction.createMany({
    data: ROWS.map((r) => ({ ...r, userId })),
  });
  await prisma.wishlistItem.createMany({
    data: WISHLIST.map((w) => ({ ...w, userId })),
  });
  console.log(`Đã seed thành công cho user: ${EMAIL}`);
  console.log(`- Số giao dịch: ${ROWS.length}`);
  console.log(`- Số món wishlist: ${WISHLIST.length}`);
}

main().finally(() => prisma.$disconnect());
