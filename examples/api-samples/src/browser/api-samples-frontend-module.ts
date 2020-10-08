/********************************************************************************
 * Copyright (C) 2019 Arm and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { ContainerModule } from 'inversify';
import { bindDynamicLabelProvider } from './label/sample-dynamic-label-provider-command-contribution';
import { bindSampleUnclosableView } from './view/sample-unclosable-view-contribution';
import { bindSampleOutputChannelWithSeverity } from './output/sample-output-channel-with-severity';
import { bindSampleMenu } from './menu/sample-menu-contribution';
import { inject, injectable } from 'inversify';
import URI from '@theia/core/lib/common/uri';
import { EditorManager } from '@theia/editor/lib/browser';
import { MiniBrowser } from '@theia/mini-browser/lib/browser/mini-browser';
import { MiniBrowserOpenHandler } from '@theia/mini-browser/lib/browser/mini-browser-open-handler';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application';

import '../../src/browser/style/branding.css';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    bindDynamicLabelProvider(bind);
    bindSampleUnclosableView(bind);
    bindSampleOutputChannelWithSeverity(bind);
    bindSampleMenu(bind);
    bind(MyMiniBrowserOpenHandler).toSelf().inSingletonScope();
    rebind(MiniBrowserOpenHandler).toService(MyMiniBrowserOpenHandler);
    bind(FrontendApplicationContribution).to(MyCustomFrontendContribution).inSingletonScope();
});

@injectable()
class MyMiniBrowserOpenHandler extends MiniBrowserOpenHandler {

    canHandle(uri: URI): number {
        // Note: `HtmlHandler` is not bound `toSelf` so we customize the behavior here and not on the backend.
        if (uri.scheme === 'file' && uri.path.ext === '.html') {
            const CODE_EDITOR_PRIORITY = 100; // See: `EditorManager#canHandle` in packages/editor/src/browser/editor-manager.ts
            return CODE_EDITOR_PRIORITY * 2;
        }
        return super.canHandle(uri);
    }

}

@injectable()
class MyCustomFrontendContribution implements FrontendApplicationContribution {

    @inject(EditorManager)
    protected editorManager: EditorManager;

    onStart(app: FrontendApplication): void {
        app.shell.onDidAddWidget(widget => {
            if (widget instanceof MiniBrowser) {
                const uri = widget.getResourceUri();
                if (uri && uri.scheme === 'file' && uri.path.ext === '.html') {
                    this.editorManager.open(uri, { widgetOptions: { ref: widget, mode: 'open-to-right' } });
                }
            }
        });
    }

}
