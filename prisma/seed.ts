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

  // â”€â”€ Test-prep content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const ieltsTest = await prisma.mockTest.create({
    data: {
      organizationId: org.id,
      title: "IELTS Academic Practice Test 1",
      testType: "IELTS",
      durationMins: 60,
      questions: {
        create: [
          {
            testType: "IELTS", skill: "READING", type: "TRUE_FALSE_NOTGIVEN", maxScore: 1,
            passageText: "The university's new library extension opened in 2024 and doubled the available study space.",
            prompt: "The library extension opened before 2020.",
            correctAnswer: "False",
          },
          {
            testType: "IELTS", skill: "READING", type: "MULTIPLE_CHOICE", maxScore: 1,
            prompt: "What is the main purpose of the passage?",
            options: ["To criticize the university", "To describe a new facility", "To compare two libraries", "To advertise a job"],
            correctAnswer: "To describe a new facility",
          },
          {
            testType: "IELTS", skill: "LISTENING", type: "FILL_BLANK", maxScore: 1,
            prompt: "Complete the sentence: The lecture starts at ___ o'clock.",
            correctAnswer: "nine",
          },
          {
            testType: "IELTS", skill: "WRITING", type: "ESSAY", maxScore: 9,
            prompt: "Some people think universities should focus on academic subjects, while others believe they should prepare students for careers. Discuss both views and give your opinion. Write at least 250 words.",
          },
          {
            testType: "IELTS", skill: "SPEAKING", type: "SPEAKING_PROMPT", maxScore: 9,
            prompt: "Describe a skill you learned that you think will be useful in your future.",
          },
        ],
      },
    },
  });

  const pteTest = await prisma.mockTest.create({
    data: {
      organizationId: org.id,
      title: "PTE Academic Practice Test 1",
      testType: "PTE",
      durationMins: 45,
      questions: {
        create: [
          {
            testType: "PTE", skill: "READING", type: "MULTIPLE_CHOICE", maxScore: 1,
            prompt: "Choose the word that best completes the sentence: The committee will ___ the proposal next week.",
            options: ["review", "reviewing", "reviewed", "reviews"],
            correctAnswer: "review",
          },
          {
            testType: "PTE", skill: "LISTENING", type: "FILL_BLANK", maxScore: 1,
            prompt: "Type the missing word you hear: 'The train departs from platform ___.'",
            correctAnswer: "four",
          },
          {
            testType: "PTE", skill: "WRITING", type: "ESSAY", maxScore: 90,
            prompt: "Summarize the following passage in one sentence of no more than 75 words: Remote work has reshaped how companies think about office space, productivity, and employee wellbeing.",
          },
          {
            testType: "PTE", skill: "SPEAKING", type: "SPEAKING_PROMPT", maxScore: 90,
            prompt: "Read the following text aloud: 'Innovation depends as much on curiosity as it does on discipline.'",
          },
        ],
      },
    },
  });

  const duolingoTest = await prisma.mockTest.create({
    data: {
      organizationId: org.id,
      title: "Duolingo English Test â€” Practice Set 1",
      testType: "DUOLINGO",
      durationMins: 30,
      questions: {
        create: [
          {
            testType: "DUOLINGO", skill: "READING", type: "MULTIPLE_CHOICE", maxScore: 1,
            prompt: "Select the real English word.",
            options: ["Glimter", "Glimmer", "Glimmar", "Glimmor"],
            correctAnswer: "Glimmer",
          },
          {
            testType: "DUOLINGO", skill: "LISTENING", type: "FILL_BLANK", maxScore: 1,
            prompt: "Type the word you hear.",
            correctAnswer: "resilient",
          },
          {
            testType: "DUOLINGO", skill: "WRITING", type: "ESSAY", maxScore: 160,
            prompt: "Write about a time you had to adapt to an unexpected change. (60-100 words)",
          },
          {
            testType: "DUOLINGO", skill: "SPEAKING", type: "SPEAKING_PROMPT", maxScore: 160,
            prompt: "Speak about your favorite way to spend a weekend for 60-90 seconds.",
          },
        ],
      },
    },
  });

  console.log("Seed complete:");
  console.log({ org: org.slug, owner: owner.email, counselor: counselor.email, student: studentUser.email });
  console.log("Mock tests:", [ieltsTest.title, pteTest.title, duolingoTest.title]);
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


