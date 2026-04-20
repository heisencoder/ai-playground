import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { PanelPositioner, DEFAULT_ANCHOR } from '../src/lib/panelPositioner.js';
import { MockPanelBox, MockLayoutManager, MockSignalEmitter } from './helpers/mocks.js';

function makePositioner(overrides = {}) {
    const panelBox = overrides.panelBox ?? new MockPanelBox();
    const layoutManager = overrides.layoutManager ?? new MockLayoutManager();
    const positioner = new PanelPositioner({
        panelBox,
        layoutManager,
        anchor: overrides.anchor,
    });
    return { positioner, panelBox, layoutManager };
}

describe('PanelPositioner: construction', () => {
    it('defaults the anchor to "top"', () => {
        const { positioner } = makePositioner();
        assert.equal(positioner.anchor, DEFAULT_ANCHOR);
        assert.equal(positioner.anchor, 'top');
    });

    it('accepts an explicit anchor of "bottom"', () => {
        const { positioner } = makePositioner({ anchor: 'bottom' });
        assert.equal(positioner.anchor, 'bottom');
    });

    it('rejects an unknown anchor value', () => {
        assert.throws(() => makePositioner({ anchor: 'side' }), RangeError);
    });

    it('rejects a missing panelBox', () => {
        assert.throws(
            () => new PanelPositioner({ panelBox: null, layoutManager: new MockLayoutManager() }),
            TypeError
        );
    });

    it('rejects a panelBox without connect()', () => {
        assert.throws(
            () =>
                new PanelPositioner({
                    panelBox: { x: 0, y: 0, height: 32 },
                    layoutManager: new MockLayoutManager(),
                }),
            TypeError
        );
    });

    it('rejects a missing layoutManager', () => {
        assert.throws(
            () => new PanelPositioner({ panelBox: new MockPanelBox(), layoutManager: null }),
            TypeError
        );
    });

    it('rejects a layoutManager without connect()', () => {
        assert.throws(
            () =>
                new PanelPositioner({
                    panelBox: new MockPanelBox(),
                    layoutManager: { primaryMonitor: {} },
                }),
            TypeError
        );
    });

    it('starts in an inactive state', () => {
        const { positioner } = makePositioner();
        assert.equal(positioner.isActive, false);
    });
});

describe('PanelPositioner: moveToBottom', () => {
    let panelBox;
    let layoutManager;
    let positioner;

    beforeEach(() => {
        ({ panelBox, layoutManager, positioner } = makePositioner());
    });

    it('repositions the panel flush with the bottom edge', () => {
        positioner.moveToBottom();
        assert.deepEqual(panelBox.positionCalls.at(-1), { x: 0, y: 1080 - 32 });
    });

    it('becomes active and reports its anchor as "bottom"', () => {
        positioner.moveToBottom();
        assert.equal(positioner.isActive, true);
        assert.equal(positioner.anchor, 'bottom');
    });

    it('records the original position so it can be restored later', () => {
        panelBox.x = 5;
        panelBox.y = 7;
        positioner.moveToBottom();
        positioner.restore();
        assert.deepEqual(panelBox.positionCalls.at(-1), { x: 5, y: 7 });
    });

    it('subscribes to panelBox height and layoutManager monitor changes', () => {
        positioner.moveToBottom();
        assert.ok(panelBox.hasHandlerFor('notify::height'));
        assert.ok(layoutManager.hasHandlerFor('monitors-changed'));
    });

    it('is idempotent when called twice in a row', () => {
        positioner.moveToBottom();
        const callsAfterFirst = panelBox.positionCalls.length;
        const handlersAfterFirst = panelBox.handlerCount + layoutManager.handlerCount;

        positioner.moveToBottom();

        assert.equal(panelBox.positionCalls.length, callsAfterFirst);
        assert.equal(panelBox.handlerCount + layoutManager.handlerCount, handlersAfterFirst);
    });

    it('re-applies position when the panel height changes', () => {
        positioner.moveToBottom();
        panelBox.setHeight(48);
        assert.deepEqual(panelBox.positionCalls.at(-1), { x: 0, y: 1080 - 48 });
    });

    it('re-applies position when monitors change', () => {
        positioner.moveToBottom();
        layoutManager.setPrimaryMonitor({ x: 1920, y: 0, width: 2560, height: 1440 });
        assert.deepEqual(panelBox.positionCalls.at(-1), { x: 1920, y: 1440 - 32 });
    });

    it('leaves the panel alone when the primary monitor is missing', () => {
        layoutManager.primaryMonitor = null;
        positioner.moveToBottom();
        assert.equal(panelBox.positionCalls.length, 0);
    });

    it('handles a non-zero monitor origin (multi-monitor layout)', () => {
        layoutManager.primaryMonitor = { x: 100, y: 200, width: 800, height: 600 };
        positioner.moveToBottom();
        assert.deepEqual(panelBox.positionCalls.at(-1), { x: 100, y: 200 + 600 - 32 });
    });

    it('falls back to assigning x/y when set_position() is unavailable', () => {
        const bareBox = new MockSignalEmitter();
        bareBox.x = 3;
        bareBox.y = 4;
        bareBox.height = 20;
        const bareLayout = new MockLayoutManager();
        const fallback = new PanelPositioner({
            panelBox: bareBox,
            layoutManager: bareLayout,
        });

        fallback.moveToBottom();

        assert.equal(bareBox.x, 0);
        assert.equal(bareBox.y, 1080 - 20);
    });

    it('treats non-numeric coordinate fields as zero', () => {
        const oddBox = new MockSignalEmitter();
        oddBox.x = 'not-a-number';
        oddBox.y = undefined;
        oddBox.height = null;
        oddBox.set_position = function (x, y) {
            this.x = x;
            this.y = y;
        };

        const layout = new MockLayoutManager();
        const p = new PanelPositioner({ panelBox: oddBox, layoutManager: layout });
        p.moveToBottom();

        assert.equal(oddBox.x, 0);
        assert.equal(oddBox.y, 1080);

        p.restore();
        assert.equal(oddBox.x, 0);
        assert.equal(oddBox.y, 0);
    });
});

describe('PanelPositioner: restore', () => {
    it('moves the panel back to its starting coordinates', () => {
        const panelBox = new MockPanelBox({ x: 0, y: 0, height: 32 });
        const layoutManager = new MockLayoutManager();
        const positioner = new PanelPositioner({ panelBox, layoutManager });

        positioner.moveToBottom();
        positioner.restore();

        assert.deepEqual(panelBox.positionCalls.at(-1), { x: 0, y: 0 });
        assert.equal(positioner.isActive, false);
        assert.equal(positioner.anchor, 'top');
    });

    it('disconnects every signal it registered', () => {
        const { panelBox, layoutManager, positioner } = makePositioner();
        positioner.moveToBottom();
        positioner.restore();
        assert.equal(panelBox.handlerCount, 0);
        assert.equal(layoutManager.handlerCount, 0);
    });

    it('is a no-op when the positioner is inactive', () => {
        const { panelBox, positioner } = makePositioner();
        positioner.restore();
        assert.equal(panelBox.positionCalls.length, 0);
        assert.equal(positioner.isActive, false);
    });

    it('does not re-apply position after restoration, even on signal emission', () => {
        const { panelBox, layoutManager, positioner } = makePositioner();
        positioner.moveToBottom();
        positioner.restore();

        const callsBefore = panelBox.positionCalls.length;
        panelBox.setHeight(64);
        layoutManager.setPrimaryMonitor({ x: 0, y: 0, width: 100, height: 100 });
        assert.equal(panelBox.positionCalls.length, callsBefore);
    });

    it('swallows errors from a misbehaving disconnect()', () => {
        const panelBox = new MockPanelBox();
        const layoutManager = new MockLayoutManager();
        layoutManager.disconnect = () => {
            throw new Error('actor already destroyed');
        };

        const positioner = new PanelPositioner({ panelBox, layoutManager });
        positioner.moveToBottom();

        assert.doesNotThrow(() => positioner.restore());
        assert.equal(positioner.isActive, false);
    });

    it('can be re-enabled after a restore cycle', () => {
        const { panelBox, positioner } = makePositioner();

        positioner.moveToBottom();
        positioner.restore();
        positioner.moveToBottom();

        assert.equal(positioner.isActive, true);
        assert.deepEqual(panelBox.positionCalls.at(-1), { x: 0, y: 1080 - 32 });
    });
});

describe('PanelPositioner: refresh', () => {
    it('is a no-op when inactive', () => {
        const { panelBox, positioner } = makePositioner();
        positioner.refresh();
        assert.equal(panelBox.positionCalls.length, 0);
    });

    it('re-applies position on demand when active', () => {
        const { panelBox, layoutManager, positioner } = makePositioner();
        positioner.moveToBottom();

        layoutManager.primaryMonitor = { x: 0, y: 0, width: 1024, height: 768 };
        positioner.refresh();

        assert.deepEqual(panelBox.positionCalls.at(-1), { x: 0, y: 768 - 32 });
    });
});
