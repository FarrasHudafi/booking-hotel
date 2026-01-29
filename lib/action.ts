"use server";
import { prisma } from "@/lib/prisma";
import { ContactSchema } from "@/lib/zod";

export const ContactMessage = async (
  prevState: unknown,
  FormData: FormData
) => {
  const validateFields = ContactSchema.safeParse(
    Object.fromEntries(FormData.entries())
  );

  if (!validateFields.success) {
    return { error: validateFields.error.flatten().fieldErrors };
  }

  const { name, email, subject, message } = validateFields.data;

  try {
    await prisma.contact.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });
    return { message: "Thanks for contact us"};
  } catch (error) {
    console.log(error);
  }
};
