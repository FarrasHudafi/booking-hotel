import ChatInbox from "@/components/admin/chat-inbox";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat Customer | Admin",
};

const AdminChatPage = () => {
  return (
    <div className="max-w-7xl px-4 py-16 mt-10 mx-auto">
      <h1 className="text-4xl font-bold text-gray-800 mb-2">Chat Customer</h1>
      <p className="text-gray-600 mb-6">
        Reply to guest messages in real time. Tutup obrolan setelah selesai
        agar tidak tetap terbuka.
      </p>
      <ChatInbox />
    </div>
  );
};

export default AdminChatPage;
