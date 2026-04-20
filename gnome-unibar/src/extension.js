import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { PanelPositioner } from './lib/panelPositioner.js';

export default class UnibarExtension extends Extension {
    enable() {
        this._positioner = new PanelPositioner({
            panelBox: Main.layoutManager.panelBox,
            layoutManager: Main.layoutManager,
        });
        this._positioner.moveToBottom();
    }

    disable() {
        this._positioner?.restore();
        this._positioner = null;
    }
}
