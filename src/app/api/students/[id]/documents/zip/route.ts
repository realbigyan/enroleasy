import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

// Bundles every uploaded document for a student into a single .zip. Files are
// small enough (a handful of ID/academic/bank documents per student) that
// building the archive in memory is simpler and safer than trying to stream
// it through Next's Web-Streams-based Response API.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();

    const student = await prisma.student.findUnique({ where: { id } });
    if (!student || student.organizationId !== session.organizationId) {
      throw new ApiError(404, "Student not found");
    }

    const documents = await prisma.document.findMany({
      where: { studentId: id, organizationId: session.organizationId },
    });
    if (documents.length === 0) throw new ApiError(404, "No documents to download");

    const zip = new JSZip();
    const usedNames = new Set<string>();

    for (const doc of documents) {
      const res = await fetch(doc.url);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());

      const rawName = doc.fileName?.trim() || `${doc.type}-${doc.id}`;
      let finalName = rawName;
      let counter = 1;
      while (usedNames.has(finalName)) {
        const dotIndex = rawName.lastIndexOf(".");
        finalName =
          dotIndex > 0
            ? `${rawName.slice(0, dotIndex)} (${counter})${rawName.slice(dotIndex)}`
            : `${rawName} (${counter})`;
        counter++;
      }
      usedNames.add(finalName);
      zip.file(finalName, buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const safeStudentName = student.fullName.replace(/[^a-z0-9]+/gi, "_");

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeStudentName}_documents.zip"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
