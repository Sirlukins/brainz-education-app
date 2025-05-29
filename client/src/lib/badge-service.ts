// Define badge types directly in this file
export type BadgeType = 
  | 'reason_giver'
  | 'fact_checker'
  | 'link_cutter'
  | 'hidden_premise_hunter'
  | 'evidence_expert';

export interface Badge {
  id: number;
  type: BadgeType;
  name: string;
  description: string;
  imageUrl: string;
}

// Map of badge types to their display information
export const BADGE_INFO: Record<BadgeType, Omit<Badge, 'id'>> = {
  'reason_giver': {
    type: 'reason_giver',
    name: 'Reason Giver',
    description: 'You gave a clear reason for your main point',
    imageUrl: '/badges/reason-giver-badge.png'
  },
  'fact_checker': {
    type: 'fact_checker',
    name: 'Fact Checker',
    description: 'You questioned if something was actually true or the whole story',
    imageUrl: '/badges/fact-checker-badge.png'
  },
  'link_cutter': {
    type: 'link_cutter',
    name: 'Link Cutter',
    description: 'You showed that even if a point is true, it doesn\'t automatically make the conclusion right',
    imageUrl: '/badges/link-cutter-badge.png'
  },
  'hidden_premise_hunter': {
    type: 'hidden_premise_hunter',
    name: 'Hidden Premise Hunter',
    description: 'You pointed out something that was being assumed without being stated',
    imageUrl: '/badges/hidden-premise-badge.png'
  },
  'evidence_expert': {
    type: 'evidence_expert',
    name: 'Evidence Expert',
    description: 'You backed up your point with proof or an example',
    imageUrl: '/badges/evidence-expert-badge.png'
  }
};

/**
 * Extract badge award from AI response text
 * @returns Badge type if found, null otherwise
 */
export function extractBadgeAward(text: string): BadgeType | null {
  // Look for patterns like [badge: reason_giver]
  const badgeRegex = /\[badge:\s*([a-z_]+)\]/i;
  const match = text.match(badgeRegex);
  
  if (match && match[1]) {
    const badgeType = match[1].toLowerCase() as BadgeType;
    
    // Validate that it's a known badge type
    if (Object.keys(BADGE_INFO).includes(badgeType)) {
      return badgeType;
    }
  }
  
  return null;
}

/**
 * Remove the badge award syntax from text
 */
export function removeBadgeAwardSyntax(text: string): string {
  return text.replace(/\[badge:\s*[a-z_]+\]/gi, '').trim();
}

/**
 * Save a badge award to the server
 */
export async function awardBadge(badgeType: BadgeType, gameType = 'thought_zombies'): Promise<boolean> {
  try {
    const response = await fetch('/api/award-badge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        badgeType,
        gameType
      })
    });
    
    if (!response.ok) {
      console.error('Failed to award badge:', await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error awarding badge:', error);
    return false;
  }
}

/**
 * Fetch all badges earned by the current user
 */
export async function fetchUserBadges(): Promise<Badge[]> {
  try {
    const response = await fetch('/api/user-badges', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error('Failed to fetch user badges:', await response.text());
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user badges:', error);
    return [];
  }
}