import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../lib/prisma";
import { buildSeedData } from "./seed-data";

const EMAIL = "demo@phy10615.vn";
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || "Demo@123456";

async function main() {
  const hashedPassword = await hashPassword(DEMO_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {
      name: "Sinh viên demo",
      emailVerified: true,
      ruleNeedsPct: 50,
      ruleWantsPct: 30,
      ruleSavingsPct: 20,
    },
    create: {
      email: EMAIL,
      name: "Sinh viên demo",
      emailVerified: true,
      ruleNeedsPct: 50,
      ruleWantsPct: 30,
      ruleSavingsPct: 20,
    },
  });

  await prisma.account.deleteMany({
    where: { userId: user.id, providerId: "credential" },
  });

  await prisma.account.upsert({
    where: { id: "demo-credential-account" },
    update: {
      accountId: user.id,
      userId: user.id,
      providerId: "credential",
      password: hashedPassword,
    },
    create: {
      id: "demo-credential-account",
      accountId: user.id,
      userId: user.id,
      providerId: "credential",
      password: hashedPassword,
    },
  });

  const { transactions, wishlist, budgets } = buildSeedData(new Date());

  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.wishlistItem.deleteMany({ where: { userId: user.id } });
  await prisma.categoryBudget.deleteMany({ where: { userId: user.id } });

  await prisma.transaction.createMany({
    data: transactions.map((t) => ({ ...t, userId: user.id })),
  });

  await prisma.wishlistItem.createMany({
    data: wishlist.map((w) => ({ ...w, userId: user.id })),
  });

  await prisma.categoryBudget.createMany({
    data: budgets.map((b) => ({ ...b, userId: user.id })),
  });

  console.log(`Đã seed thành công cho user: ${EMAIL}`);
  console.log(`- Số giao dịch: ${transactions.length}`);
  console.log(`- Số món wishlist: ${wishlist.length}`);
  console.log(`- Số ngân sách danh mục: ${budgets.length}`);
}

main()
  .catch((err) => {
    console.error("Seed thất bại:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
