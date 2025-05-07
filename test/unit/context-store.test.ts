import { MCPContextStore } from '../../src/mcp/context-store';
import { MCP } from '../../src/mcp/types';

describe('MCPContextStore', () => {
    let store: MCPContextStore;

    beforeEach(() => {
        store = new MCPContextStore();
    });

    test('should add a context item', () => {
        const item: MCP.ContextItem = {
            key: 'test',
            value: 'value',
            confidence: 1.0,
            source: 'test-agent',
            timestamp: new Date()
        };

        store.add(item);

        expect(store.has('test')).toBe(true);
        expect(store.get('test')).toEqual(item);
    });

    test('should update a context item', () => {
        const item: MCP.ContextItem = {
            key: 'test',
            value: 'value',
            confidence: 1.0,
            source: 'test-agent',
            timestamp: new Date()
        };

        store.add(item);
        store.update('test', 'new-value', 0.8);

        const updated = store.get('test');

        expect(updated?.value).toBe('new-value');
        expect(updated?.confidence).toBe(0.8);
    });

    test('should throw error when updating non-existent item', () => {
        expect(() => {
            store.update('non-existent', 'value');
        }).toThrow();
    });

    test('should delete a context item', () => {
        const item: MCP.ContextItem = {
            key: 'test',
            value: 'value',
            confidence: 1.0,
            source: 'test-agent',
            timestamp: new Date()
        };

        store.add(item);
        expect(store.has('test')).toBe(true);

        store.delete('test');
        expect(store.has('test')).toBe(false);
    });

    test('should merge multiple context items', () => {
        const items: MCP.ContextItem[] = [
            {
                key: 'test1',
                value: 'value1',
                confidence: 1.0,
                source: 'test-agent',
                timestamp: new Date()
            },
            {
                key: 'test2',
                value: 'value2',
                confidence: 0.8,
                source: 'test-agent',
                timestamp: new Date()
            }
        ];

        store.merge(items);

        expect(store.has('test1')).toBe(true);
        expect(store.has('test2')).toBe(true);
        expect(store.get('test1')?.value).toBe('value1');
        expect(store.get('test2')?.value).toBe('value2');
    });

    test('should create and restore snapshots', () => {
        const item1: MCP.ContextItem = {
            key: 'test1',
            value: 'value1',
            confidence: 1.0,
            source: 'test-agent',
            timestamp: new Date()
        };

        store.add(item1);

        // Create snapshot
        const snapshotId = store.createSnapshot('snapshot-1');

        // Add another item
        const item2: MCP.ContextItem = {
            key: 'test2',
            value: 'value2',
            confidence: 0.8,
            source: 'test-agent',
            timestamp: new Date()
        };

        store.add(item2);

        expect(store.has('test1')).toBe(true);
        expect(store.has('test2')).toBe(true);

        // Restore snapshot
        const restored = store.restoreSnapshot(snapshotId);

        expect(restored).toBe(true);
        expect(store.has('test1')).toBe(true);
        expect(store.has('test2')).toBe(false);
    });

    test('should filter by source', () => {
        const item1: MCP.ContextItem = {
            key: 'test1',
            value: 'value1',
            confidence: 1.0,
            source: 'agent-1',
            timestamp: new Date()
        };

        const item2: MCP.ContextItem = {
            key: 'test2',
            value: 'value2',
            confidence: 0.8,
            source: 'agent-2',
            timestamp: new Date()
        };

        store.add(item1);
        store.add(item2);

        const agent1Items = store.getBySource('agent-1');
        const agent2Items = store.getBySource('agent-2');

        expect(agent1Items.length).toBe(1);
        expect(agent2Items.length).toBe(1);
        expect(agent1Items[0].key).toBe('test1');
        expect(agent2Items[0].key).toBe('test2');
    });

    test('should filter by confidence', () => {
        const item1: MCP.ContextItem = {
            key: 'test1',
            value: 'value1',
            confidence: 0.6,
            source: 'test-agent',
            timestamp: new Date()
        };

        const item2: MCP.ContextItem = {
            key: 'test2',
            value: 'value2',
            confidence: 0.8,
            source: 'test-agent',
            timestamp: new Date()
        };

        store.add(item1);
        store.add(item2);

        const highConfidenceItems = store.getByConfidence(0.7);

        expect(highConfidenceItems.length).toBe(1);
        expect(highConfidenceItems[0].key).toBe('test2');
    });

    test('should maintain history for items', () => {
        const item: MCP.ContextItem = {
            key: 'test',
            value: 'value1',
            confidence: 1.0,
            source: 'test-agent',
            timestamp: new Date()
        };

        store.add(item);
        store.update('test', 'value2');
        store.update('test', 'value3');

        const history = store.getHistory('test');

        expect(history.length).toBe(3);
        expect(history[0].value).toBe('value1');
        expect(history[1].value).toBe('value2');
        expect(history[2].value).toBe('value3');
    });
});