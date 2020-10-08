/********************************************************************************
 * Copyright (C) 2017 TypeFox and others.
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

import { enableJSDOM } from '@theia/core/lib/browser/test/jsdom';

const disableJSDOM = enableJSDOM();

import { Container } from 'inversify';
import * as chai from 'chai';
import { ProblemManager } from './problem-manager';
import URI from '@theia/core/lib/common/uri';
import { LocalStorageService, StorageService } from '@theia/core/lib/browser/storage-service';
import { Event } from '@theia/core/lib/common/event';
import { ILogger } from '@theia/core/lib/common/logger';
import { MockLogger } from '@theia/core/lib/common/test/mock-logger';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { Range } from 'vscode-languageserver-types';

disableJSDOM();

const expect = chai.expect;
let manager: ProblemManager;
let testContainer: Container;

beforeEach(() => {
    testContainer = new Container();
    testContainer.bind(ILogger).to(MockLogger);
    testContainer.bind(StorageService).to(LocalStorageService).inSingletonScope();
    testContainer.bind(LocalStorageService).toSelf().inSingletonScope();
    testContainer.bind(FileService).toConstantValue(<FileService>{
        onDidFilesChange: Event.None
    });
    testContainer.bind(ProblemManager).toSelf();

    manager = testContainer.get(ProblemManager);
    manager.cleanAllMarkers();
    manager.setMarkers(new URI('file:/foo/bar.txt'), 'me', [
        {
            range: {
                start: {
                    line: 1,
                    character: 1
                },
                end: {
                    line: 1,
                    character: 1
                }
            },
            message: 'Foo'
        },
        {
            range: {
                start: {
                    line: 1,
                    character: 1
                },
                end: {
                    line: 1,
                    character: 1
                }
            },
            message: 'Bar'
        }
    ]);

    manager.setMarkers(new URI('file:/foo/foo.txt'), 'me', [
        {
            range: {
                start: {
                    line: 1,
                    character: 1
                },
                end: {
                    line: 1,
                    character: 1
                }
            },
            message: 'Foo'
        },
        {
            range: {
                start: {
                    line: 1,
                    character: 1
                },
                end: {
                    line: 1,
                    character: 2
                }
            },
            message: 'Bar'
        }
    ]);
});

describe('problem-manager', () => {

    it('replaces markers', () => {
        let events = 0;
        manager.onDidChangeMarkers(() => {
            events++;
        });
        expect(events).equal(0);
        const previous = manager.setMarkers(new URI('file:/foo/bar.txt'), 'me', [
            {
                range: {
                    start: {
                        line: 2,
                        character: 3
                    },
                    end: {
                        line: 2,
                        character: 1
                    }
                },
                message: 'Foo'
            },
            {
                range: {
                    start: {
                        line: 1,
                        character: 1
                    },
                    end: {
                        line: 1,
                        character: 1
                    }
                },
                message: 'Bar'
            }
        ]);
        expect(previous.length).equal(2);
        expect(events).equal(1);
        expect(manager.findMarkers().length).equal(4);
    });

    it('should find markers with filter', () => {
        expect(manager.findMarkers({
            owner: 'me'
        }).length).equal(4);

        expect(manager.findMarkers({
            owner: 'you'
        }).length).equal(0);

        expect(manager.findMarkers({
            uri: new URI('file:/foo/foo.txt'),
            owner: 'me'
        }).length).equal(2);

        expect(manager.findMarkers({
            dataFilter: data => data.range.end.character > 1
        }).length).equal(1);
    });

    describe('#getUris', () => {

        it('should return the list of uris', () => {
            const uris: string[] = Array.from(manager.getUris());
            expect(uris.length).to.equal(2);
        });

        it('should return 0 uris when no markers are present', () => {
            manager.cleanAllMarkers();
            const uris: string[] = Array.from(manager.getUris());
            expect(uris.length).to.equal(0);
        });

    });

    describe('#getProblemStat', () => {

        it('should return 0 stats when no markers are present', () => {
            manager.cleanAllMarkers();
            const { errors, warnings, infos } = manager.getProblemStat();
            expect(errors).to.equal(0);
            expect(warnings).to.equal(0);
            expect(infos).to.equal(0);
        });

        it('should return the proper problem stats', () => {

            // Clean the markers for test data.
            manager.cleanAllMarkers();

            const range: Range = {
                start: {
                    line: 1, character: 1
                },
                end: {
                    line: 1, character: 1
                }
            };

            // Create 3 error, 2 warning and 1 info markers.
            manager.setMarkers(new URI('foo'), 'bar', [
                {
                    message: 'error-1',
                    range,
                    severity: 1,
                },
                {
                    message: 'error-2',
                    range,
                    severity: 1,
                },
                {
                    message: 'error-3',
                    range,
                    severity: 1,
                },
                {
                    message: 'warning-1',
                    range,
                    severity: 2,
                },
                {
                    message: 'warning-2',
                    range,
                    severity: 2,
                },
                {
                    message: 'info-1',
                    range,
                    severity: 3,
                }
            ]);

            // Get the total problem stats.
            const { errors, warnings, infos } = manager.getProblemStat();

            expect(errors).to.equal(3);
            expect(warnings).to.equal(2);
            expect(infos).to.equal(1);
        });

    });

});
