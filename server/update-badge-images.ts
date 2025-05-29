import { db } from "../db";
import { badges } from "../db/schema";
import { eq } from "drizzle-orm";

async function updateBadgeImages() {
  try {
    console.log("Starting badge image update...");
    
    // Define badge types and their new image URLs
    const badgeUpdates = [
      { name: 'reason_giver', imageUrl: '/badges/reason-giver-badge.png' },
      { name: 'fact_checker', imageUrl: '/badges/fact-checker-badge.png' },
      { name: 'link_cutter', imageUrl: '/badges/link-cutter-badge.png' },
      { name: 'hidden_premise_hunter', imageUrl: '/badges/hidden-premise-badge.png' },
      { name: 'evidence_expert', imageUrl: '/badges/evidence-expert-badge.png' }
    ];
    
    // Update each badge
    for (const badge of badgeUpdates) {
      const result = await db
        .update(badges)
        .set({ imageUrl: badge.imageUrl })
        .where(eq(badges.name, badge.name))
        .returning();
      
      console.log(`Updated ${badge.name} badge: ${result.length > 0 ? 'success' : 'no matching badge found'}`);
    }
    
    console.log("Badge image update completed");
    
    // Verify the updates
    const updatedBadges = await db.select().from(badges);
    console.log("Current badge configurations:");
    updatedBadges.forEach(badge => {
      console.log(`- ${badge.name}: ${badge.imageUrl}`);
    });
    
  } catch (error) {
    console.error("Error updating badge images:", error);
  }
}

// Run the update
updateBadgeImages()
  .catch(console.error)
  .finally(() => process.exit());