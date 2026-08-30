import { auth } from "@/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE =
  8 * 1024 * 1024;

const MAX_EXTRACTED_CHARACTERS =
  80_000;

const ACCEPTED_EXTENSIONS =
  new Set([
    "pdf",
    "docx",
    "csv",
  ]);

function getExtension(
  filename: string,
) {
  return (
    filename
      .split(".")
      .pop()
      ?.toLowerCase() ?? ""
  );
}

function truncateText(
  text: string,
) {
  if (
    text.length <=
    MAX_EXTRACTED_CHARACTERS
  ) {
    return {
      text,
      truncated: false,
    };
  }

  return {
    text:
      text.slice(
        0,
        MAX_EXTRACTED_CHARACTERS,
      ) +
      "\n\n[Content truncated by Vigil]",
    truncated: true,
  };
}

async function extractPdf(
  buffer: ArrayBuffer,
) {
  const pdfjs =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const loadingTask =
    pdfjs.getDocument({
      data: new Uint8Array(
        buffer,
      ),
    });

  const pdf =
    await loadingTask.promise;

  const pages: string[] = [];

  for (
    let pageNumber = 1;
    pageNumber <=
    pdf.numPages;
    pageNumber += 1
  ) {
    const page =
      await pdf.getPage(
        pageNumber,
      );

    const content =
      await page.getTextContent();

    const text =
      content.items
        .map((item) =>
          "str" in item
            ? item.str
            : "",
        )
        .join(" ");

    pages.push(
      `--- Page ${pageNumber} ---\n${text}`,
    );
  }

  return pages.join(
    "\n\n",
  );
}

async function extractDocx(
  buffer: ArrayBuffer,
) {
  const mammoth =
    await import(
      "mammoth"
    );

  const result =
    await mammoth.extractRawText(
      {
        buffer: Buffer.from(
          buffer,
        ),
      },
    );

  return result.value;
}

async function extractCsv(
  buffer: ArrayBuffer,
) {
  return new TextDecoder(
    "utf-8",
  ).decode(buffer);
}

export async function POST(
  request: Request,
) {
  const session =
    await auth();

  if (!session?.user?.id) {
    return Response.json(
      {
        success: false,
        message:
          "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (
      !(file instanceof File)
    ) {
      return Response.json(
        {
          success: false,
          message:
            "A file is required.",
        },
        {
          status: 400,
        },
      );
    }

    const extension =
      getExtension(
        file.name,
      );

    if (
      !ACCEPTED_EXTENSIONS.has(
        extension,
      )
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Only PDF, DOCX and CSV files are supported.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      return Response.json(
        {
          success: false,
          message:
            "Files must be 8 MB or smaller.",
        },
        {
          status: 413,
        },
      );
    }

    const buffer =
      await file.arrayBuffer();

    let extractedText =
      "";

    switch (extension) {
      case "pdf":
        extractedText =
          await extractPdf(
            buffer,
          );
        break;

      case "docx":
        extractedText =
          await extractDocx(
            buffer,
          );
        break;

      case "csv":
        extractedText =
          await extractCsv(
            buffer,
          );
        break;
    }

    const normalized =
      extractedText.trim();

    if (!normalized) {
      return Response.json(
        {
          success: false,
          message:
            "Vigil could not extract readable text from this file.",
        },
        {
          status: 422,
        },
      );
    }

    const {
      text,
      truncated,
    } =
      truncateText(
        normalized,
      );

    return Response.json({
      success: true,

      data: {
        name: file.name,
        type: file.type,
        size: file.size,

        kind: extension,

        text,

        truncated,
      },
    });
  } catch (error) {
    console.error(
      "Failed to extract orchestration attachment:",
      error,
    );

    return Response.json(
      {
        success: false,
        message:
          "Failed to process file.",
      },
      {
        status: 500,
      },
    );
  }
}