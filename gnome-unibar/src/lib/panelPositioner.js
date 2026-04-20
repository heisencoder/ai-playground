/**
 * Core panel-positioning logic for the Unibar GNOME Shell extension.
 *
 * This module is deliberately decoupled from GNOME Shell globals: every
 * collaborator (the panel actor, the layout manager, the monitor descriptor)
 * is injected via the constructor. That keeps the logic straightforward to
 * unit-test with plain JavaScript mocks outside of a live GNOME session.
 */

const DEFAULT_ANCHOR = 'top';

/**
 * Moves the GNOME Shell top panel to the bottom of the primary monitor and
 * restores it to the top on demand. The positioner reacts to panel-size and
 * monitor-layout changes so the panel remains flush with the bottom edge.
 */
export class PanelPositioner {
    /**
     * @param {object} options
     * @param {object} options.panelBox - The Shell panel actor (Main.layoutManager.panelBox).
     * @param {object} options.layoutManager - The Shell layout manager (Main.layoutManager).
     * @param {string} [options.anchor] - 'top' or 'bottom'. Defaults to 'top'.
     */
    constructor({ panelBox, layoutManager, anchor = DEFAULT_ANCHOR }) {
        if (!panelBox || typeof panelBox.connect !== 'function') {
            throw new TypeError('panelBox must be provided and support connect()');
        }
        if (!layoutManager || typeof layoutManager.connect !== 'function') {
            throw new TypeError('layoutManager must be provided and support connect()');
        }
        if (anchor !== 'top' && anchor !== 'bottom') {
            throw new RangeError(`anchor must be 'top' or 'bottom', got '${anchor}'`);
        }

        this._panelBox = panelBox;
        this._layoutManager = layoutManager;
        this._anchor = anchor;
        this._active = false;
        this._originalPosition = null;
        this._signalHandles = [];
    }

    /**
     * Whether the panel is currently being held at the bottom of the screen.
     * @returns {boolean}
     */
    get isActive() {
        return this._active;
    }

    /**
     * Configured anchor target: 'top' or 'bottom'.
     * @returns {string}
     */
    get anchor() {
        return this._anchor;
    }

    /**
     * Pins the panel to the bottom of the primary monitor. Idempotent.
     */
    moveToBottom() {
        if (this._active) {
            return;
        }
        this._active = true;
        this._anchor = 'bottom';
        this._originalPosition = {
            x: this._readCoord(this._panelBox, 'x'),
            y: this._readCoord(this._panelBox, 'y'),
        };

        this._connect(this._panelBox, 'notify::height', () => this._applyPosition());
        this._connect(this._layoutManager, 'monitors-changed', () => this._applyPosition());

        this._applyPosition();
    }

    /**
     * Restores the panel to its original top position and drops all signal
     * handlers. Safe to call repeatedly.
     */
    restore() {
        if (!this._active) {
            return;
        }
        this._active = false;
        this._anchor = 'top';
        this._disconnectAll();

        if (this._originalPosition) {
            const { x, y } = this._originalPosition;
            this._setPanelPosition(x, y);
            this._originalPosition = null;
        }
    }

    /**
     * Recomputes the panel's position based on the current primary monitor.
     * Exposed so callers and tests can trigger a refresh explicitly.
     */
    refresh() {
        if (!this._active) {
            return;
        }
        this._applyPosition();
    }

    _applyPosition() {
        const monitor = this._layoutManager.primaryMonitor;
        if (!monitor) {
            return;
        }
        const panelHeight = this._readCoord(this._panelBox, 'height');
        const x = monitor.x;
        const y = monitor.y + monitor.height - panelHeight;
        this._setPanelPosition(x, y);
    }

    _setPanelPosition(x, y) {
        if (typeof this._panelBox.set_position === 'function') {
            this._panelBox.set_position(x, y);
            return;
        }
        this._panelBox.x = x;
        this._panelBox.y = y;
    }

    _connect(target, signal, handler) {
        const id = target.connect(signal, handler);
        this._signalHandles.push({ target, id });
        return id;
    }

    _disconnectAll() {
        for (const { target, id } of this._signalHandles) {
            try {
                target.disconnect(id);
            } catch {
                // A disconnected or destroyed actor can throw; ignore so that
                // restore() always cleans up the remaining handles.
            }
        }
        this._signalHandles = [];
    }

    _readCoord(obj, prop) {
        const value = obj?.[prop];
        return typeof value === 'number' ? value : 0;
    }
}

export { DEFAULT_ANCHOR };
