import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./logger";

export async function seedAdminUser(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    logger.warn(
      "ADMIN_EMAIL ou ADMIN_PASSWORD não definidos — admin não será criado automaticamente",
    );
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id, isAdmin: usersTable.isAdmin })
    .from(usersTable)
    .where(eq(usersTable.email, email.trim().toLowerCase()));

  if (existing?.isAdmin) {
    logger.info("Usuário admin já existe no banco de dados");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    await db
      .update(usersTable)
      .set({ isAdmin: true, passwordHash, updatedAt: new Date() })
      .where(eq(usersTable.id, existing.id));
    logger.info("Usuário existente atualizado com privilégio de admin");
  } else {
    await db.insert(usersTable).values({
      email: email.trim().toLowerCase(),
      passwordHash,
      isAdmin: true,
      firstName: "Admin",
      lastName: null,
      profileImageUrl: null,
    });
    logger.info("Usuário admin criado com sucesso");
  }
}
