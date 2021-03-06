/**
 * This file is part of the vscode-powertools distribution.
 * Copyright (c) Next.e.GO Mobile SE, Aachen, Germany (https://www.e-go-mobile.com/)
 *
 * vscode-powertools is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * vscode-powertools is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import * as _ from 'lodash';
import * as ego_contracts from '../contracts';
import * as ego_helpers from '../helpers';
import * as ego_workspace from '../workspace';
import * as vscode from 'vscode';


/**
 * Name of the key for storing event instances.
 */
export const KEY_EVENTS = 'events';


/**
 * Disposes all workspace events.
 */
export function disposeEvents() {
    const WORKSPACE: ego_workspace.Workspace = this;

    const EVENT_LIST: ego_contracts.WorkspaceEvent[] = WORKSPACE.instanceState[
        KEY_EVENTS
    ];
    while (EVENT_LIST.length > 0) {
        const EVENT = EVENT_LIST.pop();

        ego_helpers.tryDispose(EVENT);
    }
}

/**
 * Reloads all workspace events.
 */
export async function reloadEvents() {
    const WORKSPACE: ego_workspace.Workspace = this;
    if (WORKSPACE.isInFinalizeState) {
        return;
    }
    if (!WORKSPACE.isInitialized) {
        return;
    }

    const SETTINGS = WORKSPACE.settings;
    if (!SETTINGS) {
        return;
    }

    disposeEvents.apply(
        this
    );

    const EVENTS = ego_helpers.asArray(SETTINGS.events).map(e => {
        return WORKSPACE.importValues(e);
    });
    if (EVENTS.length < 1) {
        return;
    }

    const EVENT_LIST: ego_contracts.WorkspaceEvent[] = WORKSPACE.instanceState[
        KEY_EVENTS
    ];

    EVENTS.forEach(e => {
        try {
            if (!WORKSPACE.doesMatchPlatformCondition(e)) {
                return;
            }
            if (!WORKSPACE.doesMatchFilterCondition(e)) {
                return;
            }

            let executeAction: ((type: string, ...args: any[]) => void | PromiseLike<void>);
            const EXECUTE_ON_DESTROYED = () => {
                if (!_.isNil(e.onDestroyed)) {
                    WORKSPACE.executeCode(
                        e.onDestroyed
                    );
                }
            };
            let disposeAction = () => {
                EXECUTE_ON_DESTROYED();
            };

            let type = ego_helpers.normalizeString(e.type);
            if ('' === type) {
                type = undefined;
            }

            const DOES_FILE_MATCH = (file: vscode.Uri, item: ego_contracts.FileEventItem): boolean => {
                const RELATIVE_PATH = WORKSPACE.toRelativePath(file.fsPath);
                if (false === RELATIVE_PATH) {
                    return false;
                }

                const FILES = ego_helpers.from(
                    ego_helpers.asArray(item.files)
                ).select(f => WORKSPACE.replaceValues(f))
                    .where(f => '' !== f.trim())
                    .toArray();

                const EXCLUDE = ego_helpers.from(
                    ego_helpers.asArray(item.exclude)
                ).select(e => WORKSPACE.replaceValues(e))
                    .where(e => '' !== e.trim())
                    .toArray();

                if (EXCLUDE.length > 0) {
                    if (
                        ego_helpers.doesMatch(RELATIVE_PATH, EXCLUDE) ||
                        ego_helpers.doesMatch('/' + RELATIVE_PATH, EXCLUDE)
                    ) {
                        return false;
                    }
                }

                if (FILES.length < 1) {
                    FILES.push('**');
                }

                return ego_helpers.doesMatch(RELATIVE_PATH, FILES) ||
                    ego_helpers.doesMatch('/' + RELATIVE_PATH, FILES);
            };

            switch (ego_helpers.normalizeString(e.action.type)) {
                case 'script':
                    {
                        executeAction = async (eventType: string, ...args: any[]) => {
                            eventType = ego_helpers.normalizeString(eventType);

                            switch (eventType) {
                                case 'document.opened':
                                    {
                                        const DOC: vscode.TextDocument = args[0];

                                        if (DOC && DOES_FILE_MATCH(DOC.uri, <ego_contracts.FileEventItem>e)) {
                                            await WORKSPACE.executeScript<ego_contracts.DocumentOpenedEventActionScriptArguments>(
                                                <ego_contracts.ScriptEventAction>e.action,
                                                (scriptArgs) => {
                                                    // scriptArgs.document
                                                    Object.defineProperty(scriptArgs, 'document', {
                                                        enumerable: true,
                                                        get: () => {
                                                            return DOC;
                                                        },
                                                    });

                                                    // scriptArgs.file
                                                    Object.defineProperty(scriptArgs, 'file', {
                                                        enumerable: true,
                                                        get: () => {
                                                            return DOC.uri;
                                                        },
                                                    });

                                                    return scriptArgs;
                                                }
                                            );
                                        }
                                    }
                                    break;

                                case 'file.changed':
                                case 'file.created':
                                case 'file.deleted':
                                    if (DOES_FILE_MATCH(args[1], <ego_contracts.FileEventItem>e)) {
                                        await WORKSPACE.executeScript<ego_contracts.FileChangeEventActionScriptArguments>(
                                            <ego_contracts.ScriptEventAction>e.action,
                                            (scriptArgs) => {
                                                // args.changeType
                                                Object.defineProperty(scriptArgs, 'changeType', {
                                                    enumerable: true,
                                                    get: () => {
                                                        return args[0];
                                                    },
                                                });

                                                // scriptArgs.document
                                                Object.defineProperty(scriptArgs, 'document', {
                                                    enumerable: true,
                                                    get: () => {
                                                        return args[2];
                                                    },
                                                });

                                                // scriptArgs.file
                                                Object.defineProperty(scriptArgs, 'file', {
                                                    enumerable: true,
                                                    get: () => {
                                                        return args[1];
                                                    },
                                                });

                                                return scriptArgs;
                                            }
                                        );
                                    }
                                    break;

                                case 'file.saved':
                                    if (DOES_FILE_MATCH(args[1], <ego_contracts.FileEventItem>e)) {
                                        await WORKSPACE.executeScript<ego_contracts.FileSavedEventActionScriptArguments>(
                                            <ego_contracts.ScriptEventAction>e.action,
                                            (scriptArgs) => {
                                                // scriptArgs.changeType
                                                Object.defineProperty(scriptArgs, 'changeType', {
                                                    enumerable: true,
                                                    get: () => {
                                                        return args[0];
                                                    },
                                                });

                                                // scriptArgs.document
                                                Object.defineProperty(scriptArgs, 'document', {
                                                    enumerable: true,
                                                    get: () => {
                                                        return args[2];
                                                    },
                                                });

                                                // scriptArgs.file
                                                Object.defineProperty(scriptArgs, 'file', {
                                                    enumerable: true,
                                                    get: () => {
                                                        return args[1];
                                                    },
                                                });

                                                return scriptArgs;
                                            }
                                        );
                                    }
                                    break;

                                case 'file.willsave':
                                    if (DOES_FILE_MATCH(args[1], <ego_contracts.FileEventItem>e)) {
                                        const EVENT_ARGS: vscode.TextDocumentWillSaveEvent = args[3];

                                        EVENT_ARGS.waitUntil(
                                            WORKSPACE.executeScript<ego_contracts.FileWillSaveEventActionScriptArguments>(
                                                <ego_contracts.ScriptEventAction>e.action,
                                                (scriptArgs) => {
                                                    // scriptArgs.changeType
                                                    Object.defineProperty(scriptArgs, 'changeType', {
                                                        enumerable: true,
                                                        get: () => {
                                                            return args[0];
                                                        },
                                                    });

                                                    // scriptArgs.document
                                                    Object.defineProperty(scriptArgs, 'document', {
                                                        enumerable: true,
                                                        get: () => {
                                                            return args[2];
                                                        },
                                                    });

                                                    // scriptArgs.file
                                                    Object.defineProperty(scriptArgs, 'file', {
                                                        enumerable: true,
                                                        get: () => {
                                                            return args[1];
                                                        },
                                                    });

                                                    // scriptArgs.reason
                                                    Object.defineProperty(scriptArgs, 'reason', {
                                                        enumerable: true,
                                                        get: () => {
                                                            return EVENT_ARGS.reason;
                                                        },
                                                    });

                                                    return scriptArgs;
                                                }
                                            )
                                        );
                                    }
                                    break;
                            }
                        };
                    }
                    break;
            }

            if (executeAction) {
                EVENT_LIST.push({
                    dispose: disposeAction,
                    execute: executeAction,
                    type: type,
                });

                if (!_.isNil(e.onCreated)) {
                    WORKSPACE.executeCode(
                        e.onCreated
                    );
                }
            }
        } catch (err) {
            WORKSPACE.logger
                .trace(err, 'events.reloadEvents(1)');
        }
    });
}
