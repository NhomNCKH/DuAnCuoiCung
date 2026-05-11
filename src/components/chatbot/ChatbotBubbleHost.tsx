"use client";

import dynamic from "next/dynamic";

const ChatbotBubble = dynamic(() => import("./ChatbotBubble"), {
  ssr: false,
});

export default function ChatbotBubbleHost() {
  return <ChatbotBubble />;
}

