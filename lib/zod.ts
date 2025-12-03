import { object, string } from "zod";

export const ContactSchema = object({
  name: string().min(6, "Name must be at least 6 characters"),
  email: string()
    .min(6, "Email must be at least 6 characters")
    .email("Invalid email"),
  subject: string().min(3, "Subject must be at least 6 characters"),
  message: string()
    .min(10, "Message must be at least 6 characters")
    .max(200, "Message must be less than 200 characters"),
});
