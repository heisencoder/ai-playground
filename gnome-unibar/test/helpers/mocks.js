/**
 * Minimal fakes for the GNOME Shell objects the extension collaborates with.
 * They mimic the parts of the Clutter signal API the positioner relies on
 * (connect / disconnect / emit) plus numeric geometry properties.
 */

export class MockSignalEmitter {
    constructor() {
        this._handlers = new Map();
        this._nextId = 1;
        this.disconnectCalls = [];
    }

    connect(signal, handler) {
        const id = this._nextId++;
        this._handlers.set(id, { signal, handler });
        return id;
    }

    disconnect(id) {
        this.disconnectCalls.push(id);
        if (!this._handlers.has(id)) {
            throw new Error(`no handler registered for id ${id}`);
        }
        this._handlers.delete(id);
    }

    emit(signal) {
        for (const { signal: name, handler } of this._handlers.values()) {
            if (name === signal) {
                handler();
            }
        }
    }

    get handlerCount() {
        return this._handlers.size;
    }

    hasHandlerFor(signal) {
        for (const { signal: name } of this._handlers.values()) {
            if (name === signal) {
                return true;
            }
        }
        return false;
    }
}

export class MockPanelBox extends MockSignalEmitter {
    constructor({ x = 0, y = 0, height = 32 } = {}) {
        super();
        this.x = x;
        this.y = y;
        this.height = height;
        this.positionCalls = [];
    }

    set_position(x, y) {
        this.x = x;
        this.y = y;
        this.positionCalls.push({ x, y });
    }

    setHeight(height) {
        this.height = height;
        this.emit('notify::height');
    }
}

export class MockLayoutManager extends MockSignalEmitter {
    constructor({ monitor = { x: 0, y: 0, width: 1920, height: 1080 } } = {}) {
        super();
        this.primaryMonitor = monitor;
    }

    setPrimaryMonitor(monitor) {
        this.primaryMonitor = monitor;
        this.emit('monitors-changed');
    }
}
