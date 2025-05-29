import type { PointsAward } from "./types";

// Parse points awarded from AI response
interface PointsAward {
  amount: number;
  type: string;
}

export async function submitResponse(
  question: string,
  userResponse: string,
  dialogueHistory: Array<{ role: "user" | "assistant", content: string }> = []
): Promise<{
  response: string;
  points?: PointsAward;
  isComplete?: boolean;
}> {
  try {
    const response = await fetch("/api/dialogue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        question,
        userResponse,
        dialogueHistory
      }),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  } catch (error) {
    console.error("AI dialogue error:", error);
    throw error;
  }
}