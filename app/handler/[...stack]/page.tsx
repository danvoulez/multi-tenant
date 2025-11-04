import { redirect } from "next/navigation";

export default function Handler() {
  // LogLineOS auth handlers are managed through the middleware
  // Redirect to dashboard
  redirect("/dashboard");
}
