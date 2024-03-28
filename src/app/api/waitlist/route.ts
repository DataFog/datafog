import axios, { HttpStatusCode } from "axios";
import { NextResponse } from "next/server";
import qs from "qs";
// import { createLoopsContact } from "@/libs/loops";
// import { addMailChimpListMember } from "@/libs/mailchimp";

export async function POST(req: Request) {
  const body = await req.json();
  const email = body.email;
  const captchaToken = body.captchaToken;

  if (!captchaToken) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: HttpStatusCode.Unauthorized }
    );
  }

  if (!email) {
    return NextResponse.json(
      { error: "Email is required" },
      { status: HttpStatusCode.BadRequest }
    );
  }

  const options = {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    data: qs.stringify({
      secret: process.env.RECAPTCHA_SECRET_KEY,
      response: captchaToken,
    }),
    url: "https://www.google.com/recaptcha/api/siteverify",
  };

  const response = await axios(options);

  if (response.data.success === false) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: HttpStatusCode.Unauthorized }
    );
  }

  try {
    /* 
      await addMailChimpListMember({
        email,
        firstName: "",
        lastName: "",
        tags: ["waitlist"],
      }); 
      */
    /* 
     await createLoopsContact({
       email,
       firstName: "",
       lastName: "",
       userGroup: "Waitlist",
      }); 
      */
  } catch (err) {
    console.error("Error while adding email contact", err);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: HttpStatusCode.InternalServerError }
    );
  }

  return Response.json({ result: true });
}
