import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { RegistrationType, UserRole, UserStatus } from "../generated/prisma/enums";

export async function seedSuperAdmin() {
  const email = "superadmin@example.com";
  const plainPassword = "SuperAdmin@123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Super admin already exists, skipping.");
    return;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const superAdmin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email,
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN, // adjust to your exact enum value
      status: UserStatus.ACTIVE,
      regType: RegistrationType.EMAIL,
      referralCode: "SUPERADMIN001", // must be unique
      isVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log("Super admin created:", superAdmin.email);
}
