/**
 * This file is part of the vscode-powertools distribution.
 * Copyright (c) e.GO Digital GmbH, Aachen, Germany (https://www.e-go-digital.com/)
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

import * as ego_contracts from './contracts';
import * as ego_helpers from './helpers';
import * as ego_log from './log';
import * as ego_resources from './resources';
import * as ego_scripts from './scripts';
import * as ego_settings_global from './settings/global';
import * as ego_workspace from './workspace';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as moment from 'moment';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';


/**
 * Registers all commands.
 *
 * @param {vscode.ExtensionContext} context The underlying extension context.
 * @param {vscode.OutputChannel} output The output channel.
 */
export function registerCommands(
    context: vscode.ExtensionContext,
    output: vscode.OutputChannel,
) {
    context.subscriptions.push(
        // apps
        vscode.commands.registerCommand('ego.power-tools.apps', async () => {
            try {
                const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = [
                    {
                        action: () => {
                            return require('./apps')
                                .openApp(context, output);
                        },
                        label: 'Open App ...',
                        description: 'Opens a global or workspace app.',
                    },
                    {
                        action: () => {
                            return require('./apps')
                                .buildAppPackage();
                        },
                        label: 'Build App Package ...',
                        description: 'Builds a package file for an app.',
                    },
                    {
                        action: () => {
                            return require('./apps')
                                .createApp();
                        },
                        label: 'Create App ...',
                        description: 'Creates a new app.',
                    },
                    {
                        action: () => {
                            return require('./apps')
                                .installApp();
                        },
                        label: 'Install App ...',
                        description: 'Installs an app from a package.',
                    },
                    {
                        action: () => {
                            return require('./apps/store')
                                .openAppStore(context);
                        },
                        label: 'Open Store ...',
                        description: 'Opens a store, where you can install apps from.',
                    }
                ];

                const SELECTED_ITEM = await vscode.window.showQuickPick(
                    QUICK_PICKS
                );

                if (SELECTED_ITEM) {
                    await Promise.resolve(
                        SELECTED_ITEM.action()
                    );
                }
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),

        // commands
        vscode.commands.registerCommand('ego.power-tools.commands', async () => {
            try {
                const ALL_WORKSPACES = ego_workspace.getAllWorkspaces();

                const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
                    ALL_WORKSPACES
                ).selectMany(ws => {
                    return ego_helpers.from(
                        ws.getCommands()
                    ).select(cmd => {
                        return {
                            command: cmd,
                            workspace: ws,
                        };
                    });
                }).select(x => {
                    return {
                        action: () => {
                            return x.command
                                .execute();
                        },
                        description: x.command.description,
                        detail: x.workspace.rootPath,
                        label: x.command.name,
                    };
                }).orderBy(qp => {
                    return ego_helpers.normalizeString(qp.label);
                }).toArray();

                const SELECT_ITEM = await vscode.window.showQuickPick(
                    QUICK_PICKS,
                    {
                        placeHolder: 'Select the command, you would like to execute ...',
                    }
                );

                if (SELECT_ITEM) {
                    await Promise.resolve(
                        SELECT_ITEM.action()
                    );
                }
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),

        // jobs
        vscode.commands.registerCommand('ego.power-tools.jobs', async () => {
            try {
                try {
                    const ALL_WORKSPACES = ego_workspace.getAllWorkspaces();

                    const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
                        ALL_WORKSPACES
                    ).selectMany(ws => {
                        return ego_helpers.from(
                            ws.getJobs()
                        ).select(j => {
                            return {
                                job: j,
                                workspace: ws,
                            };
                        });
                    }).select(x => {
                        let label = '  ' + x.job.name;
                        if (x.job.isRunning) {
                            label = '$(primitive-square)' + label;
                        } else {
                            label = '$(triangle-right)' + label;
                        }

                        return {
                            action: () => {
                                if (x.job.isRunning) {
                                    x.job.stop();
                                } else {
                                    x.job.start();
                                }
                            },
                            description: x.job.description,
                            detail: x.workspace.rootPath,
                            label: label,
                        };
                    }).orderBy(qp => {
                        return ego_helpers.normalizeString(qp.label);
                    }).toArray();

                    const SELECT_ITEM = await vscode.window.showQuickPick(
                        QUICK_PICKS,
                        {
                            placeHolder: 'Start or stop a job, by selecting it ...',
                        }
                    );

                    if (SELECT_ITEM) {
                        await Promise.resolve(
                            SELECT_ITEM.action()
                        );
                    }
                } catch (e) {
                    ego_helpers.showErrorMessage(e);
                }
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),

        // globalSettings
        vscode.commands.registerCommand('ego.power-tools.globalSettings', async () => {
            try {
                await ego_settings_global.openGlobalSettings(context);
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),

        // logs
        vscode.commands.registerCommand('ego.power-tools.logs', async () => {
            try {
                const LOG_DIR = path.resolve(
                    path.join(
                        os.homedir(), ego_contracts.HOMEDIR_SUBFOLDER
                    )
                );

                const LOG_FILES: {
                    date: moment.Moment,
                    path: string,
                    stats: fs.Stats,
                }[] = [];

                if (await ego_helpers.isDirectory(LOG_DIR, false)) {
                    for (const ITEM of await fsExtra.readdir(LOG_DIR)) {
                        try {
                            const FULL_ITEM_PATH = path.resolve(
                                path.join(
                                    LOG_DIR, ITEM
                                )
                            );

                            const STATS = await fsExtra.stat(
                                FULL_ITEM_PATH
                            );

                            if (STATS.isFile()) {
                                if (FULL_ITEM_PATH.endsWith('.log')) {
                                    const DATE = moment.utc(
                                        path.basename(
                                            ITEM, path.extname(ITEM)
                                        ),
                                        ego_log.LOG_FILE_FORMAT
                                    );

                                    if (DATE.isValid()) {
                                        LOG_FILES.push({
                                            date: DATE,
                                            path: FULL_ITEM_PATH,
                                            stats: STATS,
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            ego_log.CONSOLE
                                   .trace(e, 'ego.power-tools.logs(1)');
                        }
                    }
                }

                const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
                    LOG_FILES
                ).orderByDescending(lf => {
                    return lf.date
                        .format('YYYYMMDD');
                }).select(lf => {
                    return {
                        action: async () => {
                            await ego_helpers.openAndShowTextDocument(
                                lf.path
                            );
                        },
                        detail: `Last Change: ${ moment(lf.stats.mtime).format('YYYY-MM-DD HH:mm:ss') }`,
                        label: lf.date
                            .format('YYYY-MM-DD'),
                    };
                }).toArray();

                if (QUICK_PICKS.length < 1) {
                    vscode.window
                        .showWarningMessage('No log files found!');

                    return;
                }

                const SELECTED_ITEM = await vscode.window.showQuickPick(
                    QUICK_PICKS,
                    {
                        canPickMany: false,
                        placeHolder: 'Select the log file, you would like to open ...',
                    }
                );

                if (SELECTED_ITEM) {
                    await Promise.resolve(
                        SELECTED_ITEM.action()
                    );
                }
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),

        // scripts
        vscode.commands.registerCommand('ego.power-tools.scripts', async () => {
            try {
                const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = [
                    {
                        action: async () => {
                            const NEW_EDITOR = await ego_helpers.openAndShowTextDocument({
                                content: ego_resources.EXAMPLE_SCRIPT,
                                language: 'javascript',
                            });

                            const WEB_VIEW = new ego_scripts.ScriptConsoleWebView(
                                context, NEW_EDITOR
                            );

                            await WEB_VIEW.open();
                        },
                        label: 'New script ...',
                        description: 'Opens a new editor for running a script.',
                    },

                    {
                        action: async () => {
                            const FILE = await vscode.window.showOpenDialog({
                                openLabel: 'Open script ...',
                                canSelectFiles: true,
                                canSelectFolders: false,
                                canSelectMany: false,
                                filters: {
                                    'JavaScript files (*.js)': [ 'js' ],
                                    'All files (*.*)': [ '*' ]
                                },
                            });

                            if (!FILE || FILE.length < 1) {
                                return;
                            }

                            const NEW_EDITOR = await ego_helpers.openAndShowTextDocument(
                                FILE[0].fsPath
                            );

                            const WEB_VIEW = new ego_scripts.ScriptConsoleWebView(
                                context, NEW_EDITOR
                            );

                            await WEB_VIEW.open();
                        },
                        label: 'Open script ...',
                        description: 'Opens an existing script file in a new editor.',
                    }
                ];

                const ACTIVE_EDITOR = vscode.window.activeTextEditor;
                if (ACTIVE_EDITOR && ACTIVE_EDITOR.document) {
                    if ('javascript' === ego_helpers.normalizeString(ACTIVE_EDITOR.document.languageId)) {
                        QUICK_PICKS.unshift({
                            action: async () => {
                                const WEB_VIEW = new ego_scripts.ScriptConsoleWebView(
                                    context, ACTIVE_EDITOR, true
                                );

                                await WEB_VIEW.open();
                            },
                            label: 'Run script ...',
                            description: 'Runs the script in the current editor.',
                        });
                    }
                }

                const SELECT_ITEM = await vscode.window.showQuickPick(
                    QUICK_PICKS
                );

                if (SELECT_ITEM) {
                    await Promise.resolve(
                        SELECT_ITEM.action()
                    );
                }
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),
    );
}
