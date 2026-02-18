import { object, string, coerce, array } from "zod";

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

export const RoomSchema = object({
  name: string().min(1, "Name is required"),
  description: string().min(
    50,
    "Fill the description with at least 50 characters",
  ),
  capacity: coerce.number().gt(0, "Fill with a valid number"),
  price: coerce.number().gt(0, "Fill with a valid number"),
  amenities: array(string()).nonempty("Select at least one amenity"),
});

export const ReserveSchema = object({
  name: string().min(1, "Name is required"),
  phone: string().min(10, "Fill with a valid phone number"),
});
