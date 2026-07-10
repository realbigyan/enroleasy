/*
  Warnings:

  - You are about to drop the `answers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `mock_tests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `test_attempts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "answers" DROP CONSTRAINT "answers_attemptId_fkey";

-- DropForeignKey
ALTER TABLE "answers" DROP CONSTRAINT "answers_questionId_fkey";

-- DropForeignKey
ALTER TABLE "mock_tests" DROP CONSTRAINT "mock_tests_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "questions" DROP CONSTRAINT "questions_mockTestId_fkey";

-- DropForeignKey
ALTER TABLE "test_attempts" DROP CONSTRAINT "test_attempts_mockTestId_fkey";

-- DropForeignKey
ALTER TABLE "test_attempts" DROP CONSTRAINT "test_attempts_studentId_fkey";

-- DropForeignKey
ALTER TABLE "test_attempts" DROP CONSTRAINT "test_attempts_userId_fkey";

-- DropTable
DROP TABLE "answers";

-- DropTable
DROP TABLE "mock_tests";

-- DropTable
DROP TABLE "questions";

-- DropTable
DROP TABLE "test_attempts";

-- DropEnum
DROP TYPE "AttemptStatus";

-- DropEnum
DROP TYPE "QuestionType";

-- DropEnum
DROP TYPE "SkillArea";
