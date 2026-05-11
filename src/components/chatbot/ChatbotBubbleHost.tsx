"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const ChatbotBubble = dynamic(() => import("./ChatbotBubble"), {
  ssr: false,
});

export default function ChatbotBubbleHost() {
  const pathname = usePathname() || "";
  const hiddenOnRoutes = [
    /^\/student\/mock-test(?:\/|$)/,
    /^\/student\/exam(?:\/|$)/,
  ];

  if (hiddenOnRoutes.some((pattern) => pattern.test(pathname))) {
    return null;
  }

  return <ChatbotBubble />;
}
