import { MCP } from './types';
import crypto from 'crypto';

/**
 * Generates a unique ID for context items
 */
export function generateContextId(): string {
    return crypto.randomUUID();
}

/**
 * Creates a timestamp for context items
 */
export function createTimestamp(): Date {
    return new Date();
}

/**
 * Deep clones a context item to prevent mutation
 */
export function cloneContextItem<T>(item: MCP.ContextItem<T>): MCP.ContextItem<T> {
    return JSON.parse(JSON.stringify(item));
}

/**
 * Calculates a confidence score for combining multiple context items
 * Uses a weighted average based on each item's confidence
 */
export function calculateCombinedConfidence(confidences: number[]): number {
    if (confidences.length === 0) return 0;

    const sum = confidences.reduce((acc, val) => acc + val, 0);
    return sum / confidences.length;
}

/**
 * Validates that a context item has all required fields
 */
export function validateContextItem(item: Partial<MCP.ContextItem>): boolean {
    return (
        !!item.key &&
        item.value !== undefined &&
        typeof item.confidence === 'number' &&
        item.confidence >= 0 &&
        item.confidence <= 1 &&
        !!item.source &&
        item.timestamp instanceof Date
    );
}

/**
 * Formats a context key by converting to lowercase and replacing spaces with underscores
 */
export function formatContextKey(key: string): string {
    return key.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Creates a new context item with all required fields
 */
export function createContextItem<T>(
    key: string,
    value: T,
    source: MCP.AgentID,
    confidence = 1.0,
    reasoning?: string,
    parentContextKeys?: string[]
): MCP.ContextItem<T> {
    return {
        key: formatContextKey(key),
        value,
        confidence,
        source,
        timestamp: createTimestamp(),
        reasoning,
        parentContextKeys
    };
}

/**
 * Checks if a context store contains all required keys for an agent to process
 */
export function hasRequiredContext(
    context: MCP.ReadonlyContextStore,
    requiredKeys: string[]
): boolean {
    return requiredKeys.every(key => context.has(key));
}