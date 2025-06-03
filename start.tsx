// src/components/StartScreen.tsx
import React from "react";

export default function StartScreen({ onStart, onSettings }: { onStart: () => void; onSettings: () => void }) {
  return (
    <div className="min-h-screen bg-[#2b2d31] text-white flex flex-col items-center justify-center px-4">
      <div className="bg-[#1e1f22] p-6 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-white mb-6">クイズタイム 🎮</h1>

        <button
          onClick={onStart}
          className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-semibold py-2 px-4 rounded-lg transition mb-4"
        >
          スタート
        </button>

        <button
          onClick={onSettings}
          className="w-full bg-[#4e5058] hover:bg-[#3c3d44] text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          設定
        </button>
      </div>

      <p className="mt-8 text-gray-400 text-sm">© 2025 Maruten Games</p>
    </div>
  );
}
