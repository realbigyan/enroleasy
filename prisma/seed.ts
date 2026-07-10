import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding EnrolEasy demo dataâ€¦");

  const passwordHash = await bcrypt.hash("password123", 10);

  const org = await prisma.organization.upsert({
    where: { slug: "everest-global-consultancy" },
    update: {},
    create: {
      name: "Everest Global Consultancy",
      slug: "everest-global-consultancy",
      country: "Nepal",
      subscription: {
        create: { plan: "GROWTH", status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + 30 * 86400000) },
      },
    },
  });

  const owner = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "owner@everest.test" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Bigyan Kandel",
      email: "owner@everest.test",
      passwordHash,
      role: "OWNER",
    },
  });

  const counselor = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "counselor@everest.test" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Sarita Sharma",
      email: "counselor@everest.test",
      passwordHash,
      role: "COUNSELOR",
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "student@everest.test" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Anish Gurung",
      email: "student@everest.test",
      passwordHash,
      role: "STUDENT",
    },
  });

  const destinations = await Promise.all(
    [
      { country: "Australia", university: "University of Melbourne", course: "MSc Data Science", intake: "Fall 2026", tuitionFeeUsd: 32000 },
      { country: "Canada", university: "University of Toronto", course: "MBA", intake: "Fall 2026", tuitionFeeUsd: 45000 },
      { country: "UK", university: "University of Manchester", course: "MSc Computer Science", intake: "Spring 2027", tuitionFeeUsd: 28000 },
    ].map((d) => prisma.destination.create({ data: { ...d, organizationId: org.id } }))
  );

  const leadsData = [
    { fullName: "Priya Thapa", stage: "NEW", source: "WEBSITE", interestedCountry: "Australia" },
    { fullName: "Rajesh KC", stage: "CONTACTED", source: "REFERRAL", interestedCountry: "Canada" },
    { fullName: "Sunita Rai", stage: "QUALIFIED", source: "SOCIAL_MEDIA", interestedCountry: "UK" },
    { fullName: "Bikash Adhikari", stage: "COUNSELING", source: "EVENT", interestedCountry: "Australia" },
    { fullName: "Manisha Poudel", stage: "APPLICATION_STARTED", source: "WALK_IN", interestedCountry: "Canada" },
    { fullName: "Deepak Shrestha", stage: "OFFER_RECEIVED", source: "PARTNER_AGENT", interestedCountry: "UK" },
  ] as const;

  for (const lead of leadsData) {
    await prisma.lead.create({
      data: {
        organizationId: org.id,
        fullName: lead.fullName,
        stage: lead.stage,
        source: lead.source,
        interestedCountry: lead.interestedCountry,
        targetIntake: "Fall 2026",
        assignedCounselorId: counselor.id,
      },
    });
  }

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      organizationId: org.id,
      userId: studentUser.id,
      fullName: "Anish Gurung",
      email: "student@everest.test",
      phone: "+977-9800000000",
    },
  });

  await prisma.application.create({
    data: {
      organizationId: org.id,
      studentId: student.id,
      destinationId: destinations[0].id,
      status: "UNDER_REVIEW",
      requiredIelts: 6.5,
      submittedAt: new Date(),
    },
  });

  await prisma.task.create({
    data: {
      organizationId: org.id,
      title: "Follow up on IELTS registration with Anish",
      assignedToId: counselor.id,
      studentId: student.id,
      dueAt: new Date(Date.now() + 3 * 86400000),
    },
  });

  console.log("Seed complete:");
  console.log({ org: org.slug, owner: owner.email, counselor: counselor.email, student: studentUser.email });
  console.log("All demo accounts use password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


