import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const signedPutUrl = String(formData.get("signedPutUrl") ?? "");
    const contentType = String(formData.get("contentType") ?? "application/octet-stream");
    const file = formData.get("file");

    if (!signedPutUrl) {
      return NextResponse.json({ message: "Missing signedPutUrl" }, { status: 400 });
    }

    if (!(file instanceof Blob)) {
      return NextResponse.json({ message: "Missing upload file" }, { status: 400 });
    }

    const uploadRes = await fetch(signedPutUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });

    if (!uploadRes.ok) {
      const detail = (await uploadRes.text()).slice(0, 500);
      return NextResponse.json(
        {
          message: "Proxy upload to signed URL failed",
          detail,
          status: uploadRes.status,
        },
        { status: uploadRes.status },
      );
    }

    return NextResponse.json({ uploaded: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Unexpected proxy upload error" },
      { status: 500 },
    );
  }
}
