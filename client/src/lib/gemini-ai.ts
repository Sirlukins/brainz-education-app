/**
 * Interface for the debate context passed to the AI
 */
interface DebateContext {
  conversationHistory: string;
  aiStance: string;
  userStance: string;
  userArgument: string;
}

/**
 * Extract the score from the AI's response using regex
 * Returns the score as a number, or 0 if no score was found
 */
export function extractScore(response: string): number {
  // Look for the pattern [Score: +XX] at the end of the text
  const scoreRegex = /\[Score: \+(\d+)\]/;
  const match = response.match(scoreRegex);
  
  // If found, return the captured number as an integer
  if (match && match[1]) {
    try {
      return parseInt(match[1], 10);
    } catch (error) {
      console.error('Failed to parse score:', error);
      return 0;
    }
  }
  
  // Default to 0 if no score found
  console.warn('No score found in AI response');
  return 0;
}

/**
 * Send a message to the Gemini AI through the server API and get a response
 */
export async function getGeminiResponse(context: DebateContext): Promise<{
  message: string;
  score: number;
  badge?: any;
}> {
  try {
    // Make a request to the server API endpoint
    const response = await fetch("/api/thought-zombies/dialogue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Include cookies for authentication
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${await response.text()}`);
    }

    // Parse the response from the server
    const data = await response.json();
    
    return {
      message: data.message,
      score: data.score,
      badge: data.badge || null
    };
  } catch (error) {
    console.error('Error getting response from Gemini API:', error);
    return {
      message: "Sorry, I encountered an error when processing your argument. Let's try again.",
      score: 0,
      badge: null
    };
  }
}