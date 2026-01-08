/**
 * Entity Extractor - Extract structured data from natural language
 * 
 * Extracts:
 * - Amounts (numeric and word forms)
 * - Descriptions
 * - Recipients (names, identifiers)
 */

export interface ExtractedEntities {
    amount: number | null;
    description: string;
    confidence: number;
    hasAmount: boolean;
}

/**
 * Convert word numbers to digits
 */
const wordToNumber: Record<string, number> = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
    'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    'hundred': 100, 'thousand': 1000, 'lakh': 100000, 'lac': 100000,
    'million': 1000000, 'crore': 10000000,
};

/**
 * Parse word-based numbers like "two thousand five hundred"
 */
function parseWordNumber(text: string): number | null {
    const normalized = text.toLowerCase().trim();
    const words = normalized.split(/\s+/);
    
    let total = 0;
    let current = 0;
    
    for (const word of words) {
        const num = wordToNumber[word];
        
        if (num === undefined) continue;
        
        if (num >= 1000) {
            // Multiplier
            current = current || 1;
            total += current * num;
            current = 0;
        } else if (num === 100) {
            current = (current || 1) * 100;
        } else {
            current += num;
        }
    }
    
    total += current;
    return total > 0 ? total : null;
}

/**
 * Extract amount from text
 */
export function extractAmount(text: string): number | null {
    const normalized = text.toLowerCase().trim();
    
    // Pattern 1: Direct numbers (500, 1000.50, 2,500)
    const directNumberMatch = normalized.match(/\b(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)\b/);
    if (directNumberMatch) {
        const cleaned = directNumberMatch[1].replace(/,/g, '');
        return parseFloat(cleaned);
    }
    
    // Pattern 2: Shorthand (2k, 1.5k, 500k, 2m)
    const shorthandMatch = normalized.match(/(\d+(?:\.\d+)?)\s*([km])\b/i);
    if (shorthandMatch) {
        const base = parseFloat(shorthandMatch[1]);
        const multiplier = shorthandMatch[2].toLowerCase();
        
        if (multiplier === 'k') return base * 1000;
        if (multiplier === 'm') return base * 1000000;
    }
    
    // Pattern 3: Indian notation (2 lakh, 5 crore)
    const indianMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(lakh|lac|crore)/i);
    if (indianMatch) {
        const base = parseFloat(indianMatch[1]);
        const unit = indianMatch[2].toLowerCase();
        
        if (unit === 'lakh' || unit === 'lac') return base * 100000;
        if (unit === 'crore') return base * 10000000;
    }
    
    // Pattern 4: Word-based numbers (two thousand five hundred)
    const wordMatch = normalized.match(/\b((?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|lac|crore|million)(?:\s+(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|lac|crore|million))*)\b/i);
    
    if (wordMatch) {
        return parseWordNumber(wordMatch[1]);
    }
    
    // Pattern 5: Currency symbols (₹500, Rs 500, $100)
    const currencyMatch = normalized.match(/[₹$]\s*(\d+(?:,?\d{3})*(?:\.\d{2})?)/);
    if (currencyMatch) {
        return parseFloat(currencyMatch[1].replace(/,/g, ''));
    }
    
    const rsMatch = normalized.match(/rs\.?\s*(\d+(?:,?\d{3})*(?:\.\d{2})?)/i);
    if (rsMatch) {
        return parseFloat(rsMatch[1].replace(/,/g, ''));
    }
    
    return null;
}

/**
 * Extract description from text (remove amount and intent keywords)
 */
export function extractDescription(text: string, amount: number | null): string {
    let description = text.toLowerCase().trim();
    
    // Remove intent keywords
    const intentKeywords = [
        'pay', 'paid', 'send', 'sent', 'transfer', 'give', 'gave', 'spend', 'spent',
        'receive', 'received', 'got', 'get', 'earn', 'earned', 'collect', 'collected',
        'for', 'on', 'from', 'to', 'of', 'the', 'a', 'an', 'is', 'was',
        'rs', 'rupees', 'rupee', 'inr', 'dollar', 'dollars',
    ];
    
    // Remove amount-related text
    if (amount !== null) {
        // Remove numeric amounts
        description = description.replace(/\b\d{1,3}(?:,?\d{3})*(?:\.\d{2})?\b/g, '');
        // Remove shorthand (2k, 500k)
        description = description.replace(/\d+(?:\.\d+)?[km]\b/gi, '');
        // Remove currency symbols
        description = description.replace(/[₹$]/g, '');
        // Remove word numbers
        description = description.replace(/\b(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|lac|crore|million)\b/gi, '');
    }
    
    // Split into words and filter
    const words = description.split(/\s+/).filter(word => {
        return word.length > 0 && !intentKeywords.includes(word);
    });
    
    // Clean up and capitalize
    let result = words.join(' ').trim();
    
    // Remove extra spaces
    result = result.replace(/\s+/g, ' ');
    
    // If empty, provide default
    if (!result) {
        return 'Voice transaction';
    }
    
    // Capitalize first letter
    return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Extract all entities from text
 */
export function extractEntities(text: string): ExtractedEntities {
    const amount = extractAmount(text);
    const description = extractDescription(text, amount);
    
    // Calculate confidence based on what we found
    let confidence = 0.5; // Base confidence
    
    if (amount !== null && amount > 0) {
        confidence += 0.3; // Found valid amount
    }
    
    if (description && description !== 'Voice transaction') {
        confidence += 0.2; // Found meaningful description
    }
    
    return {
        amount,
        description,
        confidence: Math.min(confidence, 1.0),
        hasAmount: amount !== null && amount > 0
    };
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number): string {
    if (amount >= 10000000) {
        return `${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
        return `${(amount / 100000).toFixed(2)} L`;
    } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(1)}k`;
    }
    return amount.toLocaleString('en-IN');
}
