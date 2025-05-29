import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import cors from 'cors';
import { db } from "@db";
import { users, aotQuestions, topicQuestions, userResponses, lstQuestions, badges, userBadges } from "@db/schema";
import { eq, sql, desc, inArray, and } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

// Helper function to calculate AOT score
function calculateAOTScore(responses: { questionId: number; response: number }[], questions: { id: number; isReversed: boolean }[]): number | null {
  // Ensure we have all questions answered
  const answeredQuestions = new Set(responses.map(r => r.questionId));
  const totalQuestions = questions.length;

  if (answeredQuestions.size !== totalQuestions) {
    return null;
  }

  // Create map of reversed questions
  const reversedMap = new Map(questions.map(q => [q.id, q.isReversed]));

  // Calculate score
  let totalScore = 0;
  for (const response of responses) {
    // Ensure response is within valid range (1-6)
    const validResponse = Math.min(Math.max(response.response, 1), 6);
    const isReversed = reversedMap.get(response.questionId) || false;

    // Calculate individual question score
    const questionScore = isReversed ? (7 - validResponse) : validResponse;

    totalScore += questionScore;
  }

  return totalScore;
}

// Initialize questions if they don't exist
async function initializeBadges() {
  try {
    // Check if badges already exist
    const existingBadges = await db.select().from(badges);
    
    if (existingBadges.length === 0) {
      console.log('No badges found, initializing badge system...');
      
      // Define the badges
      const badgesList = [
        {
          name: 'reason_giver',
          description: 'You gave a clear reason for your main point',
          imageUrl: '/badges/reason-giver-badge.png'
        },
        {
          name: 'fact_checker',
          description: 'You questioned if something was actually true or the whole story',
          imageUrl: '/badges/fact-checker-badge.png'
        },
        {
          name: 'link_cutter',
          description: 'You showed that even if a point is true, it doesn\'t automatically make the conclusion right',
          imageUrl: '/badges/link-cutter-badge.png'
        },
        {
          name: 'hidden_premise_hunter',
          description: 'You pointed out something that was being assumed without being stated',
          imageUrl: '/badges/hidden-premise-badge.png'
        },
        {
          name: 'evidence_expert',
          description: 'You backed up your point with proof or an example',
          imageUrl: '/badges/evidence-expert-badge.png'
        }
      ];
      
      // Insert all badges
      await Promise.all(
        badgesList.map(badge => db.insert(badges).values(badge))
      );
      
      console.log('Badge system initialized successfully');
    } else {
      console.log(`Found ${existingBadges.length} existing badges, skipping initialization`);
    }
  } catch (error) {
    console.error('Failed to initialize badges:', error);
  }
}

async function initializeQuestions() {
  try {
    // Get existing topic questions
    const existingTopicQuestions = await db.select().from(topicQuestions);
    console.log(`Found ${existingTopicQuestions.length} existing topic questions`);

    const topicQuestionsList = [
      "The Government should ban abortion",
      "You need to support LGBTQ+ people to be a good person",
      "Owning a gun is a fundamental right",
      "The feminist movement has gone too far",
      "Being overweight is a problem that should be addressed",
      "Cosmetic surgery should be treated as normal as makeup",
      "Police violence is exaggerated by the media",
      "Men and women have natural differences that make men better at certain things",
      "Prison sentences are too light",
      "TikTok is harmful and the world would be better without it",
      "Trans women have a competitive advantage that is unfair",
      "Eating animals is morally acceptable",
      "Sons and daughters should be raised differently",
      "Smacking children can be an acceptable form of discipline",
      "Polygamy (having more than one wife or husband at the same time) should be legalised",
      "The death penalty is a fair punishment for certain crimes",
      "The government should be allowed to force people to get vaccinated for serious diseases",
      "There are too many 'Welcome to country' ceremonies these days"
    ];
    
    // Only initialize topic questions if they don't exist
    if (existingTopicQuestions.length === 0) {
      console.log('No existing topic questions found, initializing...');
      // Insert all topic questions
      await Promise.all(
        topicQuestionsList.map(question =>
          db.insert(topicQuestions).values({ question })
        )
      );
      console.log('Topic questions initialized successfully');
    } else {
      console.log('Topic questions already exist, skipping initialization');
    }

    // Initialize AOT questions if they don't exist
    const existingAOTQuestions = await db.select().from(aotQuestions);

    if (existingAOTQuestions.length === 0) {
      const aotQuestionsList = [
        { question: "Changing your mind is a sign of weakness.", isReversed: true },
        { question: "A person should always consider new possibilities." },
        { question: "If I think longer about a problem I will be more likely to solve it." },
        { question: "Basically, I know everything I need to know about the important things in life.", isReversed: true },
        { question: "Considering too many different opinions often leads to bad decisions.", isReversed: true },
        { question: "Solutions to problems usually happen by thinking about them, rather than by waiting for good luck." },
        { question: "It's OK to be undecided about some things." },
        { question: "It's bad to change how you think about something.", isReversed: true },
        { question: "Coming to decisions quickly is a sign of wisdom.", isReversed: true },
        { question: "It doesn't really matter if I get some facts wrong because the facts are always changing anyway.", isReversed: true },
        { question: "I like to gather many different types of information or evidence before I decide what to do." },
        { question: "I don't feel I have to have reasons for what I do.", isReversed: true }
      ];

      await Promise.all(
        aotQuestionsList.map(q => db.insert(aotQuestions).values(q))
      );
      console.log('Initialized AOT questions');
    }

    // Verify questions were initialized
    const [topicCount, aotCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(topicQuestions),
      db.select({ count: sql<number>`count(*)` }).from(aotQuestions)
    ]);

    console.log(`Verification - Topic questions: ${topicCount[0].count}, AOT questions: ${aotCount[0].count}`);

  } catch (error) {
    console.error('Failed to initialize questions:', error);
    throw error; // Rethrow to ensure server doesn't start if initialization fails
  }
}

export function registerRoutes(app: Express): Server {
  // Enable CORS
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Add health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Initialize questions and badges when the server starts
  Promise.all([
    initializeQuestions(),
    initializeBadges()
  ]).catch(console.error);

  // Setup authentication routes
  setupAuth(app);

  // Add route to update display name
  app.post("/api/update-display-name", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not logged in" });
    }

    try {
      const { displayName } = req.body;

      if (!displayName || typeof displayName !== 'string' || displayName.trim() === '') {
        return res.status(400).json({ message: "Display name is required" });
      }

      console.log(`[User] Updating display name for user ${req.user.id} to "${displayName}"`);

      // Update the user's display name
      const [updatedUser] = await db
        .update(users)
        .set({ displayName: displayName.trim() })
        .where(eq(users.id, req.user.id))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`[User] Display name updated successfully for user ${req.user.id}`);

      // Return user data with updated display name
      return res.status(200).json({
        message: "Display name updated successfully",
        user: {
          ...req.user,
          displayName: updatedUser.displayName
        }
      });
    } catch (error) {
      console.error("[User] Error updating display name:", error);
      return res.status(500).json({ 
        message: "Failed to update display name",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Add AI dialogue endpoint
  app.post("/api/dialogue", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const { question, userResponse, dialogueHistory } = req.body;

      const systemPrompt = `You are Plato, a training instructor helping humans survive in a world where zombies can detect rigid thinking. Your role is to engage in philosophical dialogue that helps humans develop actively open-minded thinking and argumentation skills.
CORE RESPONSIBILITIES:
1. Engage in respectful debate, always arguing against the user's position
2. Present ONLY ONE concise counterargument or question per response
3. Use a Socratic approach - ask probing questions about their assumptions rather than lengthy explanations
4. Award points to the user using this syntax: {award_points: [amount], type: "[reason]"}. Place this at the beginning of your response.
5. Award badges for specific argumentation skills using [badge: badge_name] syntax. Place this before your response.

CONVERSATION STYLE REQUIREMENTS:
- Keep responses SHORT (3-5 sentences maximum)
- Focus on asking questions that make the user reflect on their assumptions
- Instead of lengthy explanations, ask for evidence or justification for claims
- Adopt a curious, open-minded tone rather than lecturing

COUNTERARGUMENT CLASSIFICATION:
1. Counter-Alternative (Counter-A):
- Ask about an alternative view: "Have you considered that short breaks might better maintain routine?"
- Award 3 points: {award_points: 3, type: "counter_a"}

2. Counter-Critique (Counter-C):
- Directly question a weakness: "Doesn't this approach only benefit certain groups? What about those who can't afford overseas trips?"
- Award 5 points: {award_points: 5, type: "counter_c"}

3. Counter-Undermine (Counter-U):
- Question the underlying reasoning: "Is travel really the primary purpose of school holidays? Shouldn't educational outcomes be the determining factor?"
- Award 7 points: {award_points: 7, type: "counter_u"}

Example good response to "Obviously overweight people should not lose weight. That is just giving in to society's expectations":
"I see your concern about resisting societal pressure. But don't you think there are health reasons to maintain a healthy weight that have nothing to do with appearance? What evidence suggests that weight and physical health aren't connected?"

BADGES FOR ARGUMENTATION SKILLS:
- If the user clearly gives a reason for their main point: [badge: reason_giver]
- If the user questions if something is actually true or questions the whole story: [badge: fact_checker]
- If the user shows that even if a premise is true, it doesn't make the conclusion true: [badge: link_cutter]
- If the user points out an unstated assumption: [badge: hidden_premise_hunter]
- If the user backs up a point with evidence or an example: [badge: evidence_expert]

Note: Only award ONE badge per response, choosing the most impressive skill demonstrated. Once a user earns a badge, don't award the same badge again.

You are currently discussing: "${question}". The user has responded: "${userResponse}".

Points can also be awarded for:
- New valid arguments: {award_points: 5, type: "new_argument"}
- Consistent civility: {award_points: 3, type: "civility"}
- Open-mindedness or thoughtfulness: {award_points: 3, type: "open_minded"}
- Training completion: {award_points: 10, type: "completion"}
Only award points for one reason at a time.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...dialogueHistory,
        { role: "user", content: userResponse }
      ];

      const result = await model.generateContent(messages.map(msg => msg.content).join('\n\n'));
      const aiResponse = result.response.text();

      // Log full AI response
      console.log(`[AI Response] Question: "${question}"\nUser: "${userResponse}"\nAI: "${aiResponse}"`);

      // Extract points from response if any
      const pointsMatch = aiResponse.match(/\{award_points:\s*(\d+),\s*type:\s*"([^"]+)"\}/);
      let points = null;
      if (pointsMatch) {
        points = {
          amount: parseInt(pointsMatch[1]),
          type: pointsMatch[2].trim()
        };
        console.log("[Points] Awarded:", points);
      }
      
      // Extract badge award if any
      const badgeMatch = aiResponse.match(/\[badge:\s*([a-z_]+)\]/i);
      let badge = null;
      if (badgeMatch && badgeMatch[1]) {
        const badgeType = badgeMatch[1].trim();
        console.log(`[Badge] Detected badge award: ${badgeType}`);
        
        try {
          // Check if this badge exists
          const badgeResults = await db
            .select()
            .from(badges)
            .where(eq(badges.name, badgeType))
            .limit(1);
            
          if (badgeResults.length > 0) {
            // Check if user already has this badge
            const existingBadge = await db
              .select()
              .from(userBadges)
              .where(
                and(
                  eq(userBadges.userId, req.user.id),
                  eq(userBadges.badgeId, badgeResults[0].id)
                )
              )
              .limit(1);
              
            if (existingBadge.length === 0) {
              // User doesn't have this badge yet, award it
              await db.insert(userBadges).values({
                userId: req.user.id,
                badgeId: badgeResults[0].id,
                gameType: 'thought_zombies'
              });
              
              badge = {
                id: badgeResults[0].id,
                type: badgeType,
                name: badgeResults[0].name,
                description: badgeResults[0].description,
                imageUrl: badgeResults[0].imageUrl
              };
              
              console.log(`[Badge] Awarded badge ${badgeType} to user ${req.user.id}`);
            } else {
              console.log(`[Badge] User ${req.user.id} already has badge ${badgeType}`);
            }
          } else {
            console.log(`[Badge] Unknown badge type: ${badgeType}`);
          }
        } catch (error) {
          console.error(`[Badge] Error awarding badge: ${error}`);
        }
      }

      // Clean the response by removing the points and badge syntax
      let cleanedResponse = aiResponse
        .replace(/\{award_points:\s*\d+,\s*type:\s*"[^"]+"\}/g, '')
        .replace(/\[badge:\s*[a-z_]+\]/gi, '')
        .trim();

      // Changed completion logic to be based on a higher point threshold
      // Only mark as complete after substantial engagement (30+ points) and minimum turns
      const totalPoints = points?.amount || 0;
      const isComplete = dialogueHistory.length >= 8 && totalPoints >= 30;

      res.json({
        response: cleanedResponse,
        points,
        badge,
        isComplete
      });

    } catch (error) {
      console.error("AI dialogue error:", error);
      res.status(500).send("Failed to process dialogue");
    }
  });

  // Add new endpoint to update user score
  app.post("/api/update-score", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    const { points } = req.body;

    try {
      // Add better logging with username (safely accessing user properties)
      const userId = req.user?.id;
      const username = req.user?.username;
      console.log(`[Score Update] Adding ${points} points to user ${userId} (${username})`);

      // Get the current user to check their score
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);
      
      // Ensure we never go below 0 points
      const safePointsToAdd = Math.max(-currentUser.totalScore, points);
      
      // Log if the points were adjusted
      if (safePointsToAdd !== points) {
        console.log(`[Score Update] Adjusted points from ${points} to ${safePointsToAdd} to prevent negative score`);
      }
      
      // Update the user's total score
      const [updatedUser] = await db
        .update(users)
        .set({
          totalScore: sql`${users.totalScore} + ${safePointsToAdd}`
        })
        .where(eq(users.id, req.user.id))
        .returning();

      console.log(`[Score Update] User ${updatedUser.username} score updated from ${currentUser.totalScore} to ${updatedUser.totalScore}`);
      
      // Check if the user might now be in the top 10
      if (updatedUser.totalScore > 0) {
        const leaderboardCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(sql`${users.totalScore} > ${updatedUser.totalScore}`)
          .limit(10);
          
        const rank = leaderboardCount[0].count + 1;
        
        if (rank <= 10) {
          console.log(`[Score Update] User ${updatedUser.username} is now rank #${rank} on the leaderboard!`);
        }
      }

      res.json({
        message: "Score updated successfully",
        newTotalScore: updatedUser.totalScore
      });
    } catch (error) {
      console.error('Failed to update score:', error);
      res.status(500).json({
        error: "Failed to update score",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint to award a badge to the current user
  app.post("/api/award-badge", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    
    const { badgeType, gameType = 'thought_zombies' } = req.body;
    
    if (!badgeType) {
      return res.status(400).json({ error: "Badge type is required" });
    }
    
    try {
      // Get the badge ID from the badges table
      const badgeResults = await db
        .select()
        .from(badges)
        .where(eq(badges.name, badgeType))
        .limit(1);
      
      if (badgeResults.length === 0) {
        return res.status(404).json({ error: `Badge type '${badgeType}' not found` });
      }
      
      const badge = badgeResults[0];
      
      // Check if user already has this badge
      const existingBadge = await db
        .select()
        .from(userBadges)
        .where(
          and(
            eq(userBadges.userId, req.user.id),
            eq(userBadges.badgeId, badge.id)
          )
        )
        .limit(1);
      
      // If user already has this badge, just return success
      if (existingBadge.length > 0) {
        return res.json({
          message: "Badge already awarded",
          badge: {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            imageUrl: badge.imageUrl
          }
        });
      }
      
      // Award the badge
      await db.insert(userBadges).values({
        userId: req.user.id,
        badgeId: badge.id,
        gameType
      });
      
      console.log(`[Badges] Awarded badge ${badge.name} to user ${req.user.id}`);
      
      // Return the badge details
      res.json({
        message: "Badge awarded successfully",
        badge: {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          imageUrl: badge.imageUrl
        }
      });
    } catch (error) {
      console.error('Failed to award badge:', error);
      res.status(500).json({
        error: "Failed to award badge",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint to get all badges earned by the current user
  app.get("/api/user-badges", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    
    try {
      // Get all badges for the current user with badge details
      const userBadgeResults = await db
        .select({
          id: userBadges.id,
          badgeId: badges.id,
          name: badges.name,
          description: badges.description,
          imageUrl: badges.imageUrl,
          earnedAt: userBadges.earnedAt
        })
        .from(userBadges)
        .innerJoin(badges, eq(userBadges.badgeId, badges.id))
        .where(eq(userBadges.userId, req.user.id))
        .orderBy(desc(userBadges.earnedAt));
      
      res.json(userBadgeResults);
    } catch (error) {
      console.error('Failed to fetch user badges:', error);
      res.status(500).json({
        error: "Failed to fetch user badges",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });


  // Add new endpoint to get user scores and topic responses with admin check
  app.get("/api/aot-scores", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).send("Unauthorized: Admin access required");
    }

    try {
      // If a specific user ID is provided, return only that user's score
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      
      // First get the basic user scores
      let basicScores;
      
      if (userId) {
        // Get scores for specific user
        basicScores = await db
          .select({
            id: users.id,
            username: users.username,
            aotScore: users.aotScore,
            hasCompletedQuestionnaire: users.hasCompletedQuestionnaire,
          })
          .from(users)
          .where(eq(users.id, userId));
      } else {
        // Get scores for all users
        basicScores = await db
          .select({
            id: users.id,
            username: users.username,
            aotScore: users.aotScore,
            hasCompletedQuestionnaire: users.hasCompletedQuestionnaire,
          })
          .from(users);
      }
      
      // Now fetch topic responses for each user
      const enhancedScores = await Promise.all(
        basicScores.map(async (user) => {
          // Get the latest response for each topic question for this user
          const topicResponses = await db.execute(sql`
            WITH latest_topic_responses AS (
              SELECT DISTINCT ON (question_id)
                question_id,
                response,
                created_at
              FROM user_responses
              WHERE user_id = ${user.id}
              AND question_type = 'topic'
              ORDER BY question_id, created_at DESC
            )
            SELECT 
              ur.question_id, 
              tq.question as question_text,
              ur.response
            FROM latest_topic_responses ur
            JOIN topic_questions tq ON ur.question_id = tq.id
            ORDER BY ur.question_id
          `);
          
          return {
            ...user,
            topicResponses: topicResponses.rows || []
          };
        })
      );

      // Add CSV export if requested
      if (req.query.format === 'csv') {
        // Prepare a more detailed CSV with topic responses
        let csvLines = ['Username,AOT Score,Completed Questionnaire,Topic Questions,Topic Responses'];
        
        enhancedScores.forEach(user => {
          const topicQuestionsStr = user.topicResponses.map((q: any) => `"${q.question_text}"`).join('|');
          const topicResponsesStr = user.topicResponses.map((q: any) => q.response).join('|');
          
          csvLines.push(
            `${user.username},${user.aotScore || 'N/A'},${user.hasCompletedQuestionnaire ? 'Yes' : 'No'},"${topicQuestionsStr}","${topicResponsesStr}"`
          );
        });
        
        const csv = csvLines.join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=user-scores-and-responses.csv');
        return res.send(csv);
      }

      // Include a timestamp in the JSON response
      res.json({
        timestamp: new Date().toISOString(),
        data: enhancedScores
      });
    } catch (error) {
      console.error('Failed to fetch user scores and responses:', error);
      res.status(500).send("Failed to fetch user scores and responses");
    }
  });
  
  // New admin endpoint for comprehensive user data dashboard
  app.get("/api/admin/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).send("Unauthorized: Admin access required");
    }
    
    try {
      // Get complete user data with scores, topic responses, and badge counts
      const userData = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          displayName: users.displayName,
          aotScore: users.aotScore,
          totalScore: users.totalScore,
          hasCompletedQuestionnaire: users.hasCompletedQuestionnaire,
          hasCompletedOnboarding: users.hasCompletedOnboarding,
          createdAt: users.createdAt
        })
        .from(users)
        .orderBy(desc(users.totalScore));
      
      // Get all topic responses and group by user
      const allTopicResponsesResult = await db.execute(sql`
        SELECT 
          ur.user_id, 
          u.username,
          ur.question_id, 
          tq.question as question_text, 
          ur.response,
          ur.created_at
        FROM user_responses ur
        JOIN users u ON ur.user_id = u.id
        JOIN topic_questions tq ON ur.question_id = tq.id
        WHERE ur.question_type = 'topic'
        ORDER BY ur.user_id, ur.created_at DESC
      `);
      
      // Get badge counts by user
      const badgeCountsResult = await db.execute(sql`
        SELECT 
          user_id, 
          COUNT(*) as badge_count 
        FROM user_badges 
        GROUP BY user_id
      `);
      
      // Fix type errors by properly handling the results
      const badgeCountMap = new Map<number, number>();
      
      if (badgeCountsResult && badgeCountsResult.rows) {
        for (const row of badgeCountsResult.rows) {
          if (row.user_id && row.badge_count) {
            badgeCountMap.set(Number(row.user_id), parseInt(row.badge_count as string));
          }
        }
      }
      
      // Group topic responses by user
      const topicResponsesByUser: Record<number, Array<{
        questionId: number;
        question: string;
        response: number;
        createdAt: Date;
      }>> = {};
      
      if (allTopicResponsesResult && allTopicResponsesResult.rows) {
        for (const response of allTopicResponsesResult.rows) {
          const userId = Number(response.user_id);
          if (!topicResponsesByUser[userId]) {
            topicResponsesByUser[userId] = [];
          }
          
          topicResponsesByUser[userId].push({
            questionId: Number(response.question_id),
            question: response.question_text as string,
            response: Number(response.response),
            createdAt: response.created_at as Date
          });
        }
      }
      
      // Combine all data
      const enhancedUserData = userData.map(user => ({
        ...user,
        badgeCount: badgeCountMap.get(user.id) || 0,
        topicResponses: topicResponsesByUser[user.id] || []
      }));
      
      // Include point history as an aggregate 
      const pointsOverTimeResult = await db.execute(sql`
        SELECT 
          DATE_TRUNC('day', created_at) as day,
          SUM(total_score) as daily_total
        FROM users
        WHERE total_score > 0
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY day
      `);
      
      // Process the points over time data to proper format
      const pointsOverTime = pointsOverTimeResult.rows ? 
        pointsOverTimeResult.rows.map(row => ({
          date: row.day as Date,
          total: Number(row.daily_total)
        })) : [];
      
      // Return comprehensive dashboard data with timestamp
      res.json({
        timestamp: new Date().toISOString(),
        users: enhancedUserData,
        pointsOverTime: pointsOverTime,
        totalUsers: userData.length,
        totalActiveUsers: userData.filter(u => u.totalScore > 0).length,
        totalPoints: userData.reduce((sum, user) => sum + (user.totalScore || 0), 0)
      });
    } catch (error) {
      console.error('Failed to fetch admin dashboard data:', error);
      res.status(500).json({
        error: "Failed to fetch admin dashboard data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Admin endpoint to export points data
  app.get("/api/admin/points-export", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).send("Unauthorized: Admin access required");
    }
    
    try {
      console.log('[Admin] Fetching detailed points data for export');
      
      // Get all users with their total scores
      const usersWithScores = await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
          displayName: users.displayName,
          totalScore: users.totalScore,
          aotScore: users.aotScore,
          hasCompletedQuestionnaire: users.hasCompletedQuestionnaire,
          createdAt: users.createdAt
        })
        .from(users)
        .orderBy(users.username);
        
      // Prepare the response data format based on requested type
      const format = req.query.format || 'json';
      
      if (format === 'csv') {
        let csvData = ['User ID,Username,Display Name,Email,Total Score,AOT Score,Questionnaire Completed,Created At'];
        
        usersWithScores.forEach(user => {
          csvData.push([
            user.id,
            `"${user.username || ''}"`,
            `"${user.displayName || ''}"`,
            `"${user.email || ''}"`,
            user.totalScore || 0,
            user.aotScore || 'N/A',
            user.hasCompletedQuestionnaire ? 'Yes' : 'No',
            user.createdAt || ''
          ].join(','));
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=points-export.csv');
        return res.send(csvData.join('\n'));
      }
      
      // Default: return JSON
      res.json({
        timestamp: new Date().toISOString(),
        users: usersWithScores,
        totalUsers: usersWithScores.length,
        totalPoints: usersWithScores.reduce((sum, user) => sum + (user.totalScore || 0), 0),
        averagePoints: usersWithScores.length > 0 
          ? Math.round(usersWithScores.reduce((sum, user) => sum + (user.totalScore || 0), 0) / usersWithScores.length) 
          : 0
      });
    } catch (error) {
      console.error('[Admin] Failed to export points data:', error);
      res.status(500).json({
        error: "Failed to export points data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Admin endpoint to download all user responses
  app.get("/api/admin/user-responses", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).send("Admin access required");
    }

    try {
      console.log('[Admin] Fetching all user responses for download');
      
      // Join user responses with users and questions to get a complete dataset
      const responses = await db.execute(sql`
        SELECT 
          u.username, 
          ur.user_id,
          ur.question_id, 
          CASE 
            WHEN ur.question_type = 'aot' THEN aq.question
            WHEN ur.question_type = 'topic' THEN tq.question
            ELSE 'Unknown'
          END as question_text,
          ur.question_type,
          ur.response,
          ur.created_at
        FROM user_responses ur
        JOIN users u ON ur.user_id = u.id
        LEFT JOIN aot_questions aq ON ur.question_id = aq.id AND ur.question_type = 'aot'
        LEFT JOIN topic_questions tq ON ur.question_id = tq.id AND ur.question_type = 'topic'
        ORDER BY ur.user_id, ur.question_type, ur.question_id, ur.created_at DESC
      `);

      // Format as CSV
      const csv = [
        'Username,UserID,QuestionID,Question,Type,Response,CreatedAt',
        ...responses.rows.map((r: any) => {
          // Escape any commas in the question text
          const escapedQuestion = r.question_text ? `"${r.question_text.replace(/"/g, '""')}"` : 'Unknown';
          return `${r.username},${r.user_id},${r.question_id},${escapedQuestion},${r.question_type},${r.response},${r.created_at}`;
        })
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=all-user-responses.csv');
      return res.send(csv);
    } catch (error) {
      console.error('[Admin] Failed to fetch all user responses:', error);
      res.status(500).send("Failed to fetch user responses");
    }
  });

  // Get AOT and Topic questions
  app.get("/api/questions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const aotQuestionsResult = await db.select({
        id: aotQuestions.id,
        question: aotQuestions.question,
        isReversed: aotQuestions.isReversed,
        type: sql<'aot'>`'aot'`.as('type'),
      })
        .from(aotQuestions)
        .orderBy(aotQuestions.id);

      const topicQuestionsResult = await db.select({
        id: topicQuestions.id,
        question: topicQuestions.question,
        type: sql<'topic'>`'topic'`.as('type'),
      })
        .from(topicQuestions)
        .orderBy(topicQuestions.id);

      res.json([...aotQuestionsResult, ...topicQuestionsResult]);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      res.status(500).send("Failed to fetch questions");
    }
  });

  // Submit a response
  app.post("/api/responses", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    const { questionId, response, questionType } = req.body;

    try {
      await db.insert(userResponses).values({
        userId: req.user.id,
        questionId,
        questionType,
        response,
      });

      res.json({ message: "Response recorded" });
    } catch (error) {
      console.error('Failed to save response:', error);
      res.status(500).send("Failed to save response");
    }
  });

  // Complete questionnaire and calculate AOT score.  Enhanced logging included from edited snippet.
  app.post("/api/complete-questionnaire", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[Auth] Unauthorized attempt to complete questionnaire');
      return res.status(401).send("Not logged in");
    }

    try {
      console.log(`[Questionnaire] Starting completion for user ${req.user.id}`);

      // Get all AOT responses for the user
      const result = await db.execute(sql`
        WITH latest_responses AS (
          SELECT DISTINCT ON (question_id)
            question_id,
            response,
            created_at
          FROM user_responses
          WHERE user_id = ${req.user.id}
          AND question_type = 'aot'
          ORDER BY question_id, created_at DESC
        )
        SELECT question_id as "questionId", response
        FROM latest_responses;
      `);

      const latestResponses = result.rows as { questionId: number; response: number }[];

      // Get all AOT questions
      const aotQuestionsList = await db
        .select({
          id: aotQuestions.id,
          isReversed: aotQuestions.isReversed,
        })
        .from(aotQuestions);

      console.log(`[Questionnaire] User ${req.user.id} has ${latestResponses.length} responses out of ${aotQuestionsList.length} questions`);

      // Calculate AOT score
      const aotScore = calculateAOTScore(latestResponses, aotQuestionsList);

      if (aotScore === null) {
        const missingCount = aotQuestionsList.length - latestResponses.length;
        console.log(`[Questionnaire] Incomplete responses for user ${req.user.id}, missing ${missingCount} questions`);
        return res.status(400).send(`Please answer all questions. Missing ${missingCount} questions.`);
      }

      // Update user's questionnaire completion status and AOT score
      const [updatedUser] = await db
        .update(users)
        .set({
          hasCompletedQuestionnaire: true,
          aotScore: aotScore,
        })
        .where(eq(users.id, req.user.id))
        .returning();

      console.log('[Auth] User questionnaire completed:', {
        userId: updatedUser.id,
        hasCompletedQuestionnaire: updatedUser.hasCompletedQuestionnaire,
        aotScore: updatedUser.aotScore
      });

      // Update the session with the new user data
      req.login(updatedUser, (err) => {
        if (err) {
          console.error('[Auth] Login after questionnaire completion failed:', err);
          return res.status(500).send("Failed to update session");
        }

        console.log('[Auth] Session updated after questionnaire completion:', {
          userId: updatedUser.id,
          sessionID: req.sessionID
        });

        return res.json({
          message: "Questionnaire completed",
          aotScore: updatedUser.aotScore,
          user: updatedUser,
        });
      });

    } catch (error) {
      console.error('[Questionnaire] Failed to complete questionnaire:', error);
      res.status(500).send("Failed to complete questionnaire");
    }
  });

  // New leaderboard endpoint - completely public with minimal dependencies
  app.get("/api/scores/top", async (req, res) => {
    try {
      // Get top 10 users by score
      const result = await db.execute(sql`
        SELECT 
          id, 
          username, 
          total_score as "totalScore"
        FROM users 
        WHERE total_score > 0
        ORDER BY total_score DESC 
        LIMIT 10
      `);
      
      // Add ranks to the results
      const rankedLeaderboard = result.rows.map((user, index) => ({
        ...user,
        rank: index + 1
      }));
      
      console.log(`[Leaderboard] Returning ${rankedLeaderboard.length} top scores`);
      
      // Return the ranked leaderboard
      res.json(rankedLeaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard data' });
    }
  });

  // Add onboarding completion endpoint
  app.post("/api/complete-onboarding", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const [updatedUser] = await db
        .update(users)
        .set({ hasCompletedOnboarding: true })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
      res.status(500).send("Failed to update onboarding status");
    }
  });

  // Example external API endpoint
  app.get("/api/external-data", async (req, res) => {
    try {
      const response = await fetch("https://api.example.com/data");
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: "Failed to fetch external data" });
    }
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Not logged in");
  });

  // Endpoint to get user's topic responses - fixed version
  app.get("/api/user-topic-responses", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      console.log(`[Topic Responses] Fetching responses for user ${req.user.id}`);
      
      // Use a simpler approach to get user's topic responses
      // First, extract the actual responses for this user
      const userTopicResponses = await db.select({
        questionId: userResponses.questionId,
        response: userResponses.response
      })
      .from(userResponses)
      .where(sql`user_id = ${req.user.id} AND question_type = 'topic'`);
      
      console.log(`[Topic Responses] Found ${userTopicResponses.length} raw responses`);
      
      if (userTopicResponses.length === 0) {
        console.log(`[Topic Responses] No responses found for user ${req.user.id}`);
        return res.json([]);
      }
      
      // Get distinct question IDs
      const questionIds = Array.from(new Set(userTopicResponses.map((r: { questionId: number }) => r.questionId)));
      console.log(`[Topic Responses] Found ${questionIds.length} unique question IDs`);
      
      // Fetch the question text for each question ID
      const questions = await db.select()
        .from(topicQuestions)
        .where(inArray(topicQuestions.id, questionIds));
      
      console.log(`[Topic Responses] Found ${questions.length} matching questions`);
      
      // Build the final response by combining questions and responses
      const topicResponses = [];
      
      // For each unique question ID, add the question and the latest response
      for (const questionId of questionIds) {
        // Get the matching question text
        const question = questions.find(q => q.id === questionId);
        
        if (question) {
          // Get all responses for this question ID
          // We need to fetch them directly from the database to sort by createdAt
          const latestResponseQuery = await db.select()
            .from(userResponses)
            .where(
              sql`user_id = ${req.user.id} AND 
                  question_id = ${questionId} AND 
                  question_type = 'topic'`)
            .orderBy(desc(userResponses.createdAt))
            .limit(1);
          
          // Take the most recent response
          if (latestResponseQuery.length > 0) {
            const latestResponse = latestResponseQuery[0];
            
            topicResponses.push({
              questionId: questionId, // Use the current question ID from our loop
              response: latestResponse.response, // Use the response value from the query
              question: question.question // Use the question text
            });
          }
        }
      }
      
      console.log(`[Topic Responses] Final result: ${topicResponses.length} topics with responses`);
      if (topicResponses.length > 0) {
        console.log(`[Topic Responses] First response: ${JSON.stringify(topicResponses[0])}`);
      }
      
      res.json(topicResponses);
    } catch (error) {
      console.error('Failed to fetch topic responses:', error);
      res.status(500).send("Failed to fetch topic responses");
    }
  });

  // Update the Health Nut dialogue endpoint
  app.post("/api/health-nut/dialogue", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const { userResponse, dialogueHistory } = req.body;

      // Count user attempts by filtering dialogue history
      const userAttempts = dialogueHistory.filter((entry: any) =>
        entry.role === "user"
      ).length;

      const systemPrompt = `You are roleplaying as either Qaylee or Plato in a health, fitness and wellness critical thinking game. The game is designed to teach critical thinking skills and concepts, specifically focusing on **Probabilistic & Statistical Reasoning** and **Scientific Reasoning**.  The specific concepts to be taught, drawn from a standardized test, are listed below.  Only focus on these concepts. Use a wide variety of examples from health, fitness, wellness and other related topics (psychology, diet, relationships, meditation, traditional medicine, astrology, etc).  The goal is to help the player improve their performance on a test similar to the one described below.

CHARACTERS:

Qaylee (Default Character):
*   Bubbly, health-fad obsessed friend who adopts a trendy wellness influencer tone.
*   Present ONE clear fallacious health/fitness claim per turn, specifically related to the listed Probabilistic/Statistical and Scientific Reasoning concepts.
*   Use trendy, enthusiastic language (e.g., "OMG", "literally", "amazing").
*   Never explain fallacies or give hints.
*   If the player doesn't push back against the claim, expand on it (without moving on to a new claim) until 3 failed attempts are made.
*   If the player asks for clarification about the basis for the claim, explain it in character (basing the claim on the same fallacious reasoning).
*   After the player pushes back or asks skeptical questions about claims, ask the player for an alternative explanation that demonstrates correct understanding of the concept.
*   When the player correctly identifies the reasoning problem made by Qaylee: respond with curiosity and gratitude.
*   When the player fails after 3 attempts on the same topic: respond with "Cool, glad you agree!"
*   At this point, STOP ANSWERING AS QAYLEE. Always explain Qaylee's fallacy as Plato, by prefixing your response with "Plato: ".

Plato (Only after 3 failed attempts):
*   Calm, wise character who explains logical fallacies.
*   Only appear after 3 failed attempts on the same topic related to the specific concepts below.
*   Provide clear, educational explanations pitched at a 15 year old's literacy level about the relevant concept, directly relating it to the type of problem found in the standardized test.
*   Always prefix your response with "Plato: "
*   After your explanation: Let Qaylee continue with a new fallacious claim, focusing on a different concept from the list.

SCORING:
Award points using this format when the player correctly identifies a fallacy:
{award_points: 3, type: "basic"}     - For an adequate explanation
{award_points: 4, type: "clear"}     - For a clear and concise explanation
{award_points: 5, type: "exceptional"} - For an exceptionally clear explanation that relates to test problems

Additional points can be awarded for:
{award_points: 5, type: "new_argument"} - For presenting a valid new argument
{award_points: 3, type: "civility"} - For maintaining civil discourse
{award_points: 3, type: "open_minded"} - For showing open-mindedness
{award_points: 10, type: "completion"} - For completing a training segment

IMPORTANT:
- Only award points for correct identification and explanation of fallacies
- Award points only once per response
- Place the points award at the beginning of your response

CRITICAL THINKING CONCEPTS TO BE EXPLORED (Probabilistic/Statistical and Scientific Reasoning ONLY):

You should include the following reasoning concepts, with claims and explanations tailored to the health, fitness, and wellness theme.  The fallacy examples are for illustrative purposes, but strongly model your examples on the structure and style of the test items.  IMPORTANT: Randomly choose between these concepts each time you begin a new topic.  Ensure variety in the types of problems presented within each concept (e.g., different Wason Selection Task scenarios, different covariation tables, etc.).

1. Probabilistic and Statistical Reasoning:

*   Base Rate Neglect:
    *   Summary:  Failing to consider the general frequency of an event (the base rate) when making judgments, and instead focusing too much on specific, often less reliable, information.  Focus on scenarios where there's a conflict between general statistical data and a specific personal anecdote.
    *   Qaylee's Fallacy (Example): "OMG, my bestie tried this new 'psychic healing' thing, and she, like, totally feels amazing now!  Even though, like, all those science-y studies say it's probably bunk, I'm totally going to try it!"
    *   Explanation of Mistake (Plato):  "Qaylee is focusing on a single person's experience (her friend) and ignoring the broader evidence (base rate) from scientific studies.  Remember, in those test questions, you always need to prioritize the information from larger studies or general statistics over individual cases."
    * Test Item Structure Reminder: Emphasize the contrast between general data and specific anecdotal experiences, mirroring the assessment's structure.

*   Gambler's Fallacy:
    *    Summary: The mistaken belief that past independent random events influence the probability of future independent random events.
    *    Qaylee's Fallacy (Example): "I've been eating really unhealthily for five meals straight! The universe has to balance it out, so my next meal will totally be healthy, even if I order fries!"
    *    Explanation of Mistake (Plato): "Each meal choice is independent.  Past unhealthy meals don't change the odds of the next meal being healthy or unhealthy.  It's like the coin flip questions in the test – a series of heads doesn't make tails more likely on the next flip."
*   Conjunction Fallacy:
      *   Summary: Mistakenly believing that the probability of two events occurring together is greater than the probability of one of those events occurring alone.
      *   Qaylee's Fallacy (Example): "There's this yoga retreat, and I know there are more people there who are both vegan and super spiritually enlightened than there are people who are just vegan."
      *   Explanation of Mistake (Plato): "It's logically impossible for the group of 'vegan AND spiritually enlightened' people to be larger than the group of just 'vegan' people. The combined group is always a subset. Think back to the survey questions on the test – the group with two characteristics is always smaller than the group with just one."
*   Sensitivity to Sample Size:
    *   Summary:  Understanding that larger samples provide more reliable and accurate estimates of a population characteristic than smaller samples.  Larger samples are less susceptible to random chance variations.
    *   Qaylee's Fallacy (Example):  "I tried this new workout routine once, and I felt amazing afterward!  It's definitely the best workout ever!"
    *   Explanation of Mistake (Plato):  "One experience (a very small sample) isn't enough to draw a reliable conclusion.  The test questions often compare results from a small group to a larger group – remember that the larger group's results are generally more trustworthy."
* **Probability Matching:**
    * **Summary:** The tendency to choose options in proportion to their probability of success, rather than always choosing the option with the highest probability.
    * **Qaylee's Fallacy (Example):**"This juice cleanse claims it works 80% of the time! So, I'll only follow it strictly for four days a week, and cheat the other days - that way it'll totally work!"
    * **Explanation of Mistake (Plato):** Qaylee is incorrectly assuming that reducing her adherence proportionally to the claimed success rate will still yield optimal results. Just like in the card-drawing tasks, she should maximize her chances by fully committing to the supposed best strategy if she believes it's truly effective, not by matching her commitment to a perceived probability.

2. Scientific Reasoning:

*   Falsification Tendencies (Wason Selection Task):
    *   Summary:  The tendency to seek confirming evidence rather than evidence that could disprove a hypothesis or rule.  Focus on presenting this in the style of the Wason Selection Task, with conditional rules and cards to turn over.
    *   Qaylee's Fallacy (Example - Deontic):  "Okay, so the rule at this spa is: 'If someone is using the infrared sauna, they must have booked a premium package.' I see someone in the sauna, someone who definitely didn't book a premium package, someone using the steam room, and someone who definitely booked a premium package. I only need to check the person in the sauna and the person with the premium package to see if the rule is being followed."
    *   Explanation of Mistake (Plato): "To check the rule, you need to look for cases that could break it. You need to check the person in the sauna (to see if they don't have a premium package) and the person who didn't book a premium package (to see if they are using the sauna). This is exactly like the card-turning problems on the test – you need to check the 'P' and 'not-Q' cases."
    *   Qaylee's Fallacy (Example - Abstract): "The rule is: 'If a smoothie has kale on one side, it has blueberries on the other.' I see smoothies that show: Kale, Spinach, Blueberries, Strawberries. I only need to check the Kale and Blueberries smoothies to see if the rule is true."
    *   Explanation of Mistake (Plato): "Again, you have to look for potential violations. You need to turn over the Kale smoothie (to see if it has blueberries) and the Strawberries smoothie (to see if it has kale). Think of the letters and numbers on the cards in the test."

*   Converging Evidence:
    *   Summary:  Drawing conclusions based on multiple, independent pieces of evidence that point to the same conclusion. The more independent sources, the stronger the conclusion.
    *   Qaylee's Fallacy (Example): "I had headaches on two days this week.  Both days I drank a new energy drink and stayed up late. So, the energy drink and staying up late are definitely causing my headaches!"
    *   Explanation of Mistake (Plato): "Qaylee needs to isolate the variables.  She needs to consider days where she had the energy drink without staying up late, and days where she stayed up late without the energy drink. Remember the allergy problems on the test? You need to find the consistent factor across multiple situations."

*   Correlation vs. Causation:
    *   Summary:  Recognizing that a correlation (relationship) between two variables does not automatically mean that one causes the other.
    *   Qaylee's Fallacy (Example): "OMG, I saw this graph that showed people who meditate regularly have lower stress levels! So, like, meditating totally causes lower stress!"
    *   Explanation of Mistake (Plato): "While there might be a link, the graph only shows a correlation. It's possible that lower stress leads to meditation, or that some other factor (like a healthy lifestyle) causes both meditation and lower stress.  Remember the test questions with the graphs – correlation doesn't prove causation."

*   Control Group Reasoning:
    *   Summary:  Understanding the importance of comparing a group that receives an intervention to a control group (that doesn't receive the intervention) to determine if the intervention is truly effective.
    *   Qaylee's Fallacy (Example): "I started using this new 'crystal-infused' water bottle, and I feel so much more hydrated! It's definitely the crystals!"
    *   Explanation of Mistake (Plato): "Qaylee needs to compare her experience to someone drinking the same amount of water from a regular bottle.  Without that comparison (a control group), she can't be sure it's the crystals, and not just drinking more water, that's making the difference. The test will always have an option that includes a proper control group."

*   Covariation Detection:
    *   Summary:  Determining if there's a relationship between two variables by systematically comparing the occurrences and non-occurrences of each.
    *   Qaylee's Fallacy (Example):  "I've been using this new app that's supposed to help me sleep.  I used it 10 times, and 7 of those times I slept great!  It totally works!"
    *   Explanation of Mistake (Plato): "Qaylee needs to consider all the possibilities.  How often did she sleep well without the app?  How often did she sleep poorly with the app? How often did she sleep poorly without the app? A 2x2 table, like the ones on the test, helps to organize this information and see if there's a real relationship."  (Plato could even sketch out a blank 2x2 table for illustration)


${dialogueHistory.length === 0 ? `INITIAL RESPONSE:
Start with Qaylee making ONE clear fallacious health claim using one of the critical thinking concepts listed above.
Format:
- Start with "Qaylee: "
- Make ONE direct, enthusiastic claim with clear logical error related to CRITICAL THINKING CONCEPTS listed above
- Keep it natural and conversational
- No questions in initial claim
- No explanation or hints about fallacy
- Focus on health/fitness topics` : ''}

Current dialogue:
${dialogueHistory.map((entry: { role: string; content: string; }) =>
  `${entry.role}: ${entry.content}`
).join('\n')}

${userResponse ? `User's response: "${userResponse}"` : ''}

IMPORTANT:
1. Always prefix responses with the speaking character's name ("Qaylee: " or "Plato: ")
2. Never combine multiple character responses in one line
3. ONE claimat a time
4. No questions in initial claims
5. Only award points for correct identification, not forsimply questioning claim
6. After Plato explains, Qaylee MUST present a new fallacious claim
7. Keep responses natural and conversational
8. Never explain fallacies as Qaylee
9. For fallacies involving data (e.g., covariation detection), provide a table formatted as a JSON object, using this format:
{table: {"headers": ["column1", "column2"], "rows": [["data1", "data2"], ["data3", "data4"]]}}`;

      const messages = [
        { role: "user", content: systemPrompt },
        ...dialogueHistory,
        ...(userResponse ? [{ role: "user", content: userResponse }] : [])
      ];

      const result = await model.generateContent(messages.map(msg => msg.content).join('\n\n'));
      const aiResponse = result.response.text();

      console.log(`[Health Nut Response] User: "${userResponse}"\nAI: "${aiResponse}"`);

      // Extract points if present
      const pointsMatch = aiResponse.match(/\{award_points:\s*(\d+),\s*type:\s*""([^"]+)"\}/);
      const tableMatch = aiResponse.match(/\{table:\s*({[^}]+})\}/);

      let points = null;
      let table = null;

      if (pointsMatch) {
        points = {
          amount: parseInt(pointsMatch[1]),
          type: pointsMatch[2].trim()
        };
      }

      if (tableMatch) {
        try {
          table = JSON.parse(tableMatch[1]);
        } catch (e) {
          console.error("Failed to parse table JSON:", e);
        }
      }

      // Split response into character segments
      const messageRegex = /(Qaylee|Plato):\s*([\s\S]*?)(?=(?:Qaylee:|Plato:|$))/g;
      const matches = Array.from(aiResponse.matchAll(messageRegex));
      const formattedMessages = matches.map(match => {
        const [, speaker, content] = match;
        const cleanContent = content
          .trim()
          .replace(/\{award_points:.*?\}/g, '')
          .replace(/\{table:.*?\}/g, '');

        const speakerType = speaker.toLowerCase() as 'plato' | 'qaylee';
        return {
          speaker: speakerType,
          content: cleanContent,
          table: speakerType === 'plato' ? table : null
        };
      });

      // Game completes after substantial engagement (8+ turns) and points earned
      const isComplete = dialogueHistory.length >= 8 && (points?.amount || 0) >= 30;

      res.json({
        messages: formattedMessages,
        points,
        isComplete
      });

    } catch (error) {
      console.error("Health Nut dialogue error:", error);
      res.status(500).send("Failed to process dialogue");
    }
  });

  // Add API endpoint for Thought Zombies AI dialogue
  app.post("/api/thought-zombies/dialogue", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not logged in");
    }

    try {
      const { conversationHistory, aiStance, userStance, userArgument } = req.body;

      // System prompt for the Thought Zombies AI
      const systemPrompt = `You are "Plato," a brilliant, logical, but down-to-earth (speak like you're a peer having a conversation with someone in their late teens) AI dialogue partner assisting high school students in improving their critical thinking and argumentation skills through debate on controversial issues. Your goal is to act as a challenging but fair opponent.
 
* Provide strong arguments for your position and argue against the user's position. Strong arguments consist of true (or plausibly true) claims (premises) that give a good reason to believe another claim (a conclusion or intermediate conclusion). When evaluating the argument of the user, you should ask yourself: If this premise WERE true, WOULD it give me a relevant reason to believe the main claim? Then ask yourself: IS this premise true (or likely to be true?). 
Strong arguments also consider and withstand the strongest possible objections.
* Good objections either justifiably attack the plausibility of specific claims, or the inferential link between those claims and the claim they are intended to support. These are usually better ways to argue than merely leaving the claims made by an opponent unaddressed and offering alternative points in your favour, because your position is weakened by those claims remaining unchallenged. A good objection can also point out hidden or assumed or missing premises. Model active open-mindedness and generosity. Acknowledge good arguments, practice charitable interpretation of the user's arguments, and be willing to ask to clarification if the user is unclear. 
* Be pedagogical. Point out where the user's argument is weak and use and terms like:
"**Claim**: A statement that the speaker wants you to believe.
**Main Claim**: The main point of the argument; the primary thing the speaker wants the audience to believe. Sometimes called the conclusion.
**Premise**: A claim that gives a reason to believe another claim.
**Evidence**: Concrete, specific factual information presented to support a claim, e.g. quote from a text, historical source, piece of data
**Reasoning**: Explains how/why the evidence helps to prove the claim.
**Objection**: A claim that gives a reason _not_ to believe another claim.
**Rebuttal**: A response to an **objection**.
**Independent Premises:** give you separate, distinct reasons to believe the claim above.
**Sub-Premise (Chain):** a premise that gives you a reason to believe another premise.
**Co-Premises:** work together or “hold hands” to give one single reason to believe the claim above, like two people making a chair with their hands to carry someone else.
Each **co-premise** logically connects the other **co-premise** to the claim above. It spells out how the other co-premise is relevant to the claim above.
If one co-premise is false, the other co-premise does not work as a reason to believe the claim. (Whereas independent premises still work, even if the other premise is false).
**Hidden co-premise:** A co-premise that the author assumes but does not explicitly state in their argument. Often the true source of disagreement lies in hidden assumptions.
One common form of co-premises is **Evidence**+**Reasoning** (see definitions above)."

**IMPORTANT STYLE GUIDELINES:**
* Keep responses VERY SHORT (3-5 sentences maximum)
* Focus on asking ONE probing question about the user's assumptions rather than lengthy explanations
* Use a Socratic approach when appropriate- ask as well as making statements
* Remember that brevity is crucial - avoid multi-paragraph responses

**Your Persona & Interaction Style:**
* **Concise & Questioning:** Use brief, focused responses and include thoughtful questions.
* **Challenging:** Identify weaknesses through questions like "But what about...?" or "Have you considered...?" and statements like "You are making the assumption that..." Be willing to push back against the user's arguments and point out mistakes, e.g. "That point actually supports my position!"
* **Charitable:** If a user's point is unclear, ask for clarification before challenging it.


**Examples of Good Responses:**
* "I see your concern about government overreach. But vaccination requirements can be viewed as protecting public health rather than restricting freedom. Why should individual freedom outweigh public safety?"
* "You make a fair point about traditional gender roles. But biological differences might be exaggerated by social conditioning. For example, from a young age boys are rewarded for aggression, while girls are praised for nurturing. This is evidence that gender roles are socially constructed."

**Point Awarding (CRITICAL):**
* After evaluating the user's response, award points using a specific syntax for each category.
* Use EXACTLY these three categories with this precise syntax at the end of your response:
  * **\`[REASONING +X: brief explanation]\`** (0-15 points): Award points when the user provides reasons or evidence for THEIR OWN position. Example: \`[REASONING +10: clearly presented logical support for their main argument]\`
  * **\`[ENGAGEMENT +X: brief explanation]\`** (0-15 points): Award points when the user engages with and responds to YOUR arguments or counterarguments. Example: \`[ENGAGEMENT +5: addressed my concern about public safety, but didn't fully counter it]\`
  * **\`[BONUS +X: brief explanation]\`** (0-5 points): Award extra points for showing active open-mindedness, acknowledging strengths in opposing views, reconsidering their position, or exceptional insight. Example: \`[BONUS +3: acknowledged the strength of counterargument while maintaining position]\`
* You MUST use these exact category tags and syntax.
* You can award 0 points in a category by writing \`[CATEGORY +0: reason]\` but you must include all three categories.
* **At the VERY END of your response, provide the total as: \`[TOTAL: +XX]\`** where XX is the sum of all categories.
* Only award the user points if they add something new to the argument. Do not award points for simply repeating or restating their previous arguments, or offering description instead of argument. If the user does this, draw their attention to it and ask them to add something new to the argument.

**BADGE AWARDING (IMPORTANT):**
* Award badges for specific argumentation skills using the syntax: \`[badge: badge_name]\` at the beginning of your response.
* Only award ONE badge per response, choosing the most impressive skill demonstrated.
* Available badges:
  * \`[badge: reason_giver]\` - Award when the user clearly gives a reason for their main point
  * \`[badge: fact_checker]\` - Award when the user plausibly questions if something is actually true or questions the whole story
  * \`[badge: link_cutter]\` - Award when the user shows that even if a premise is true, it doesn't make the conclusion true
  * \`[badge: hidden_premise_hunter]\` - Award when the user points out an unstated assumption
  * \`[badge: evidence_expert]\` - Award when the user backs up a point with evidence or an example
* Do not award a badge if none of these skills are clearly demonstrated
* Once a user earns a particular badge, do NOT award the same badge type again`;

      // Format the conversation history
      const formattedUserMessage = `Conversation History:
${conversationHistory}

Your Stance: ${aiStance}
User's Stance: ${userStance}

User's Latest Argument:
${userArgument}

Evaluate the User's Latest Argument based on the principles and persona outlined in your instructions. Provide your counter-argument and remember to include points in all three categories (REASONING, ENGAGEMENT, BONUS) followed by the TOTAL at the end.`;

      const messages = [
        { role: "user", content: systemPrompt },
        { role: "user", content: formattedUserMessage }
      ];

      console.log("[Thought Zombies Request]", {
        aiStance,
        userStance,
        userArgument
      });

      // Get AI response from Gemini
      const result = await model.generateContent({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "user", parts: [{ text: formattedUserMessage }] }
        ]
      });
      
      const aiResponse = result.response.text();
      console.log(`[Thought Zombies Response] AI: "${aiResponse}"`);

      // Extract the score from the AI response using the new format
      // Look for [TOTAL: +X] format first (new format)
      const totalScoreRegex = /\[TOTAL: \+(\d+)\]/i;
      const totalMatch = aiResponse.match(totalScoreRegex);
      
      // Fallback to old format if needed
      const oldScoreRegex = /\[Score: \+(\d+)\]/i;
      const oldMatch = aiResponse.match(oldScoreRegex);
      
      // Extract category scores (new format)
      const reasoningRegex = /\[REASONING \+(\d+):[^\]]*\]/i;
      const engagementRegex = /\[ENGAGEMENT \+(\d+):[^\]]*\]/i;
      const bonusRegex = /\[BONUS \+(\d+):[^\]]*\]/i;
      
      // Try to match each category
      const reasoningMatch = aiResponse.match(reasoningRegex);
      const engagementMatch = aiResponse.match(engagementRegex);
      const bonusMatch = aiResponse.match(bonusRegex);
      
      // Calculate score based on matches
      let score = 0;
      
      // First try using the new TOTAL format
      if (totalMatch && totalMatch[1]) {
        score = parseInt(totalMatch[1], 10);
        console.log(`[Score] Extracted from TOTAL: ${score}`);
      } 
      // Next, try using individual categories
      else if (reasoningMatch || engagementMatch || bonusMatch) {
        const reasoning = reasoningMatch && reasoningMatch[1] ? parseInt(reasoningMatch[1], 10) : 0;
        const engagement = engagementMatch && engagementMatch[1] ? parseInt(engagementMatch[1], 10) : 0;
        const bonus = bonusMatch && bonusMatch[1] ? parseInt(bonusMatch[1], 10) : 0;
        
        score = reasoning + engagement + bonus;
        console.log(`[Score] Calculated from categories: R=${reasoning}, E=${engagement}, B=${bonus}, Total=${score}`);
      }
      // Fall back to old format as a last resort
      else if (oldMatch && oldMatch[1]) {
        score = parseInt(oldMatch[1], 10);
        console.log(`[Score] Using old format: ${score}`);
      }

      // Extract badge award if present
      const badgeRegex = /\[badge:\s*([a-z_]+)\]/i;
      const badgeMatch = aiResponse.match(badgeRegex);
      let badge = null;

      if (badgeMatch && badgeMatch[1]) {
        const badgeType = badgeMatch[1].trim();
        console.log(`[Badge] Detected badge award in Thought Zombies: ${badgeType}`);
        
        try {
          // Check if this badge exists
          const badgeResults = await db
            .select()
            .from(badges)
            .where(eq(badges.name, badgeType))
            .limit(1);
            
          if (badgeResults.length > 0) {
            // Found the badge
            badge = badgeResults[0];
          }
        } catch (error) {
          console.error("[Badge] Error checking badge:", error);
        }
      }

      res.json({
        message: aiResponse,
        score,
        badge
      });

    } catch (error) {
      console.error("Thought Zombies dialogue error:", error);
      res.status(500).send("Failed to process dialogue");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}