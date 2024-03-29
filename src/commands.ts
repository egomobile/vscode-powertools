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
import * as ego_contracts from './contracts';
import * as ego_data from './data';
import * as ego_geo from './geo';
import * as ego_global_commands from './global/commands';
import * as ego_global_jobs from './global/jobs';
import * as ego_helpers from './helpers';
import * as ego_http from './http';
import * as ego_log from './log';
import * as ego_markdown from './markdown';
import * as ego_resources from './resources';
import * as ego_scripts from './scripts';
import * as ego_settings_global from './settings/global';
import * as ego_tools_quickcode from './tools/quickcode';
import * as ego_tools_typescript from './tools/typescript';
import * as ego_workspace from './workspace';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
const geodist = require('geodist');
const hexy = require('hexy');
const moment = require('moment');
import * as path from 'path';
import * as toml from 'toml';
import * as vscode from 'vscode';
import * as xml from 'xml2js';
import * as yaml from 'js-yaml';


const SUPPORTED_LANGUAGES = [
    'coffeescript',
    'javascript',
];

const SUPPORTED_TYPESCRIPT_SRC_LANGUAGES = [
    'javascript',
    'json',
    'toml',
    'xml',
    'xsl',
    'yaml',
];


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
    const GENERATE_TYPESCRIPT = async function (doc?: vscode.TextDocument) {
        if (arguments.length < 1) {
            const ACTIVE_EDITOR = vscode.window.activeTextEditor;
            if (ACTIVE_EDITOR) {
                doc = ACTIVE_EDITOR.document;
            }
        }

        if (_.isNil(doc)) {
            vscode.window.showWarningMessage(
                'No active editor found.'
            );

            return;
        }

        const LANGUAGE_NOT_SUPPORTED = Symbol('LANGUAGE_NOT_SUPPORTED');

        const LANGUAGE = ego_helpers.normalizeString(doc.languageId);

        let val: any = LANGUAGE_NOT_SUPPORTED;
        if ('json' === LANGUAGE) {
            val = JSON.parse(
                doc.getText()
            );
        } else if ('yaml' === LANGUAGE) {
            val = yaml.safeLoad(
                doc.getText()
            );
        } else if ('toml' === LANGUAGE) {
            val = toml.parse(
                doc.getText()
            );
        } else if (['xml', 'xsl'].indexOf(LANGUAGE) > -1) {
            val = await xml.parseStringPromise(
                doc.getText()
            );
        } else if ('javascript' === LANGUAGE) {
            let codeToExecute = doc.getText()
                .trim();
            if (!codeToExecute.startsWith('return ')) {
                codeToExecute = 'return ' + codeToExecute;
            }
            if (!codeToExecute.endsWith(';')) {
                codeToExecute += ';';
            }

            val = await Promise.resolve(eval(`(async () => {

${ codeToExecute}

})()`));
        }

        if (val === LANGUAGE_NOT_SUPPORTED) {
            vscode.window.showWarningMessage(
                `Language '${LANGUAGE}' is not supported.`
            );
        } else {
            const TYPESCRIPT = ego_tools_typescript.toTypeScript(
                val
            );

            const NEW_TEXT_DOCUMENT = await vscode.workspace.openTextDocument({
                content: TYPESCRIPT,
                language: 'typescript',
            });

            await vscode.window.showTextDocument(
                NEW_TEXT_DOCUMENT,
                vscode.ViewColumn.Two,
            );
        }
    };

    const OPEN_CODE_EXECUTION = async () => {
        let lastCode = ego_helpers.toStringSafe(
            context.globalState
                .get(ego_contracts.KEY_LAST_CODE_EXECUTION, '')
        );
        if (ego_helpers.isEmptyString(lastCode)) {
            lastCode = undefined;
        }

        const CODE = await vscode.window.showInputBox({
            placeHolder: 'Code To Execute (enter $help for help screen) ...',
            value: lastCode,
        });

        if (ego_helpers.isEmptyString(CODE)) {
            return;
        }

        try {
            const RESULT = await ego_tools_quickcode._exec_fcac50a111604220b8173024b6925905({
                code: CODE,
            });

            if (!_.isUndefined(RESULT)) {
                if (RESULT && _.isSymbol(RESULT['__httpresponse_tm_19790905'])) {
                    const WEB_VIEW = new ego_http.HttpResponseWebView(RESULT);

                    await WEB_VIEW.initialize();
                    await WEB_VIEW.open();
                } else if (RESULT && _.isSymbol(RESULT['__markdown_tm_19790905'])) {
                    const WEB_VIEW = new ego_markdown.MarkdownWebView({
                        fullWidth: ego_helpers.toBooleanSafe(RESULT.fullWidth),
                        markdown: RESULT.markdown,
                        title: ego_helpers.isEmptyString(RESULT.title) ? 'Code Execution Result (Markdown)'
                            : ego_helpers.toStringSafe(RESULT.title).trim()
                    });

                    await WEB_VIEW.open();
                } else if (RESULT && _.isSymbol(RESULT['__neweditor_tm_19790905'])) {
                    const DOC = await vscode.workspace.openTextDocument({
                        content: RESULT.text,
                        language: RESULT.lang,
                    });

                    await vscode.window.showTextDocument(
                        DOC, RESULT.column,
                    );
                } else if (RESULT && _.isSymbol(RESULT['__map_tm_19790905'])) {
                    await ego_geo.openMapView(
                        context,
                        {
                            center: RESULT.center,
                            markers: RESULT.markers,
                        }
                    );
                } else if (RESULT && _.isSymbol(RESULT['__csv_tm_19790905'])) {
                    const WEB_VIEW = new ego_data.CsvTableWebView(
                        RESULT.data,
                        RESULT.options,
                    );

                    await WEB_VIEW.initialize();
                    await WEB_VIEW.open();
                } else if (RESULT && _.isSymbol(RESULT['__clipboard_tm_19790905'])) {
                    await vscode.env.clipboard.writeText(
                        ego_helpers.toStringSafe(
                            RESULT.text
                        )
                    );

                    vscode.window.showInformationMessage(
                        'Value has been copied to clipboard.'
                    );
                } else if (RESULT && _.isSymbol(RESULT['__georoute_tm_19790905'])) {
                    let md = `# Geo Route\n\n`;
                    md += `Nr | Location (latitude, longitude) | Distance, in m | Bearing, in degree\n`;
                    md += `----- | ----- | ----- | -----\n`;

                    // array of [lat, lng]
                    const LOCATIONS: [number, number][] = RESULT.locations;
                    for (let i = 0; i < LOCATIONS.length; i++) {
                        const LOC = RESULT.locations[i];

                        const LAT = LOC[0];
                        const LNG = LOC[1];

                        let distanceCol = '';
                        if (i > 0) {
                            const PREV_LOC = RESULT.locations[i - 1];

                            const DISTANCE: number = geodist({
                                lat: PREV_LOC[0], lon: PREV_LOC[1]
                            }, {
                                lat: LAT, lon: LNG
                            }, {
                                exact: true,
                                unit: 'meters',
                            });

                            distanceCol = DISTANCE.toString();
                        }

                        let bearingCol = '';
                        if (LOCATIONS.length > 1) {
                            const NEXT_LOC = RESULT.locations[i + 1];
                            if (NEXT_LOC) {
                                bearingCol = ego_helpers.calcBearing(
                                    LOC[0], LOC[1],
                                    NEXT_LOC[0], NEXT_LOC[1],
                                ).toString();
                            }
                        }

                        md += `${i + 1} | \`${ego_helpers.escapeMarkdown(
                            JSON.stringify(LOC)
                        )}\` (📍 [open](https://maps.google.com/?z=10&q=${LAT},${LNG})) | ${distanceCol} | ${bearingCol} \n`;
                    }

                    const WEB_VIEW = new ego_markdown.MarkdownWebView({
                        markdown: md,
                        title: `Geo Route`,
                    });

                    await WEB_VIEW.open();
                } else if (Buffer.isBuffer(RESULT)) {
                    let md = '# Code Execution Result (Buffer)\n\n';
                    md += '```\n';
                    md += ego_helpers.escapeMarkdown(hexy.hexy(RESULT)) + "\n";
                    md += '```';

                    const WEB_VIEW = new ego_markdown.MarkdownWebView({
                        markdown: md,
                        title: 'Code Execution Result (Buffer)',
                    });

                    await WEB_VIEW.open();
                } else if (_.isArray(RESULT) || _.isPlainObject(RESULT)) {
                    const TYPE = _.isArray(RESULT) ? 'Array' : 'Object';
                    const COL_1 = _.isArray(RESULT) ? 'Index' : 'Property';

                    let md = `# Code Execution Result (${TYPE})\n\n`;
                    md += `${COL_1} | Value\n`;
                    md += `----- | -----\n`;
                    for (const KEY of ego_helpers.from(Object.keys(RESULT)).orderBy(k => ego_helpers.normalizeString(k))) {
                        const VALUE = RESULT[KEY];

                        let json: any;
                        try {
                            if (_.isNull(VALUE)) {
                                json = '*(null)*';
                            } else if (_.isUndefined(VALUE)) {
                                json = '*(undefined)*';
                            } else {
                                json = '`' + ego_helpers.escapeMarkdown(
                                    _.isString(VALUE) ? VALUE : JSON.stringify(VALUE)
                                ) + '`';
                            }
                        } catch {
                            json = '*(ERROR)*';
                        }

                        md += `${KEY} | ${json}\n`;
                    }

                    const WEB_VIEW = new ego_markdown.MarkdownWebView({
                        markdown: md,
                        title: `Code Execution Result (${TYPE})`,
                    });

                    await WEB_VIEW.open();
                } else {
                    vscode.window.showInformationMessage(
                        ego_helpers.toStringSafe(RESULT)
                    );
                }
            }
        } finally {
            try {
                await context.globalState
                    .update(ego_contracts.KEY_LAST_CODE_EXECUTION, CODE);
            } catch (e) {
                ego_log.CONSOLE
                    .trace(e, 'ego.power-tools.tools(1)');
            }
        }
    };

    const SEND_TO = async () => {
        const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = [
            {
                action: () => {
                    return require('./tools/slack')
                        .sendToSlack(context, output);
                },
                label: `$(comment-discussion)  Slack ...`,
                description: 'Sends the current file in the active editor to a Slack channel.',
            },
        ];

        const SELECTED_ITEM = await vscode.window.showQuickPick(
            QUICK_PICKS
        );

        if (SELECTED_ITEM) {
            await Promise.resolve(
                SELECTED_ITEM.action()
            );
        }
    };

    const SHOW_TCP_PROXY_ACTIONS = async () => {
        await require('./tools/proxies')
            .showTcpProxyActions(context, output);
    };

    context.subscriptions.push(
        // apps
        vscode.commands.registerCommand('ego.power-tools.apps', async () => {
            try {
                const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = [
                    {
                        action: () => {
                            return require('./apps')
                                .buildAppPackage();
                        },
                        label: `$(gift)  Build App Package ...`,
                        description: 'Builds a package file for an app.',
                    },
                    {
                        action: () => {
                            return require('./apps')
                                .createApp();
                        },
                        label: `$(plus)  Create App ...`,
                        description: 'Creates a new app.',
                    },
                    {
                        action: () => {
                            return require('./apps')
                                .installApp();
                        },
                        label: `$(diff-added)  Install App ...`,
                        description: 'Installs an app from a package.',
                    },
                    {
                        action: () => {
                            return require('./apps')
                                .openApp(context, output);
                        },
                        label: `$(plug)  Open App ...`,
                        description: 'Opens a global or workspace app.',
                    },
                    {
                        action: () => {
                            return require('./apps/store')
                                .openAppStore(context, output);
                        },
                        label: `$(database)  Open Store ...`,
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

        // Azure DevOps
        vscode.commands.registerCommand('ego.power-tools.azureDevOps', async () => {
            try {
                await require('./azure')
                    .showAzureDevOpsActions(context, output);
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),

        // codeExecution
        vscode.commands.registerCommand('ego.power-tools.codeExecution', async () => {
            try {
                await OPEN_CODE_EXECUTION();
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
                                .execute({});
                        },
                        description: x.command.description,
                        detail: x.workspace.rootPath,
                        label: x.command.name,
                    };
                }).orderBy(qp => {
                    return ego_helpers.normalizeString(qp.label);
                }).pipe(qp => {
                    qp.label = `$(zap)  ${qp.label}`.trim();
                }).toArray();

                if (QUICK_PICKS.length < 1) {
                    vscode.window.showWarningMessage(
                        'No commands found!'
                    );

                    return;
                }

                const SELECT_ITEM = await vscode.window.showQuickPick(
                    QUICK_PICKS,
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

        // execute command
        vscode.commands.registerCommand('ego.power-tools.executeCommand.currentFileOrFolder', async function (fileOrFolder?: vscode.Uri) {
            try {
                if (_.isNil(fileOrFolder)) {
                    // try active editor

                    const ACTIVE_EDITOR = vscode.window.activeTextEditor;
                    if (ACTIVE_EDITOR) {
                        const DOC = ACTIVE_EDITOR.document;
                        if (DOC) {
                            fileOrFolder = vscode.Uri.file(
                                DOC.fileName
                            );
                        }
                    }
                }

                if (_.isNil(fileOrFolder)) {
                    vscode.window.showWarningMessage(
                        'No file or folder opened or selected!'
                    );

                    return;
                }

                if (!(await ego_helpers.exists(fileOrFolder.fsPath))) {
                    vscode.window.showWarningMessage(
                        `'${fileOrFolder.fsPath}' does not exist!`
                    );

                    return;
                }

                let commandPredicate: (cmd: ego_contracts.GlobalCommand) => boolean;
                let executionSource: ego_contracts.CommandExecutionSource;
                const EXECUTION_DATA: ego_contracts.KeyValuePairs = {};
                let typeForDisplay: string;
                if (await ego_helpers.isDirectory(fileOrFolder.fsPath, false)) {
                    // folder

                    executionSource = ego_contracts.CommandExecutionSource.Folder;

                    typeForDisplay = 'folder';
                    EXECUTION_DATA['folder'] = fileOrFolder;

                    commandPredicate = (cmd) => ego_helpers.toBooleanSafe(cmd.item.forFolder);
                } else {
                    // file

                    executionSource = ego_contracts.CommandExecutionSource.File;

                    typeForDisplay = 'file';
                    EXECUTION_DATA['file'] = fileOrFolder;

                    commandPredicate = (cmd) => ego_helpers.toBooleanSafe(cmd.item.forFile);
                }

                const MATCHING_COMMANDS: {
                    command: ego_contracts.GlobalCommand,
                    detail?: string,
                }[] = [];

                // collect all global commands
                ego_global_commands.getGlobalUserCommands().forEach(cmd => {
                    MATCHING_COMMANDS.push({
                        command: cmd,
                    });
                });

                // matching workspace commands
                ego_helpers.from(
                    ego_workspace.getAllWorkspaces()
                ).where(ws => {
                    return ws.isPathOf(fileOrFolder.fsPath);  // only workspaces, where item is part in
                }).forEach(ws => {
                    ws.getCommands().forEach(cmd => {
                        // collect commands of
                        // matching workspace
                        MATCHING_COMMANDS.push({
                            command: cmd,
                            detail: ws.rootPath,
                        });
                    });
                });

                // generate wuick picks
                const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = ego_helpers.from(
                    MATCHING_COMMANDS
                ).where(x => {
                    return commandPredicate(x.command);
                }).select(x => {
                    return {
                        action: async () => {
                            await x.command.execute({
                                data: EXECUTION_DATA,
                                source: executionSource,
                            });
                        },
                        description: x.command.description,
                        detail: x.detail,
                        label: x.command.name,
                    };
                }).orderBy(x => {
                    return ego_helpers.normalizeString(x.label);
                }).thenBy(x => {
                    return ego_helpers.normalizeString(x.detail);
                }).toArray();

                if (QUICK_PICKS.length < 1) {
                    vscode.window.showWarningMessage(
                        `No command found for that ${typeForDisplay}!`
                    );

                    return;
                }

                let selectedItem: ego_contracts.ActionQuickPickItem;
                if (1 === QUICK_PICKS.length) {
                    selectedItem = QUICK_PICKS[0];
                } else {
                    selectedItem = await vscode.window.showQuickPick(
                        QUICK_PICKS,
                        {
                            canPickMany: false,
                            ignoreFocusOut: true,
                            placeHolder: `Select one or more command, that should be executed for that ${typeForDisplay} ...`,
                        }
                    );
                }

                if (selectedItem) {
                    await selectedItem.action();
                }
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),

        // help
        vscode.commands.registerCommand('ego.power-tools.help', async () => {
            try {
                await require('./help')
                    .openHelp(context);
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),

        // jobs
        vscode.commands.registerCommand('ego.power-tools.jobs', async () => {
            try {
                const QUICK_PICKS: ego_contracts.ActionQuickPickItem<ego_contracts.WorkspaceJob>[] = ego_helpers.from(
                    ego_workspace.getAllWorkspaces()
                ).selectMany(ws => {
                    return ego_helpers.from(
                        ws.getJobs()
                    ).select(j => {
                        return {
                            job: j,
                            workspace: ws,
                        };
                    });
                }).concat(
                    ego_helpers.from(
                        ego_global_jobs.getGlobalUserJobs()
                    ).select(j => {
                        return {
                            job: j,
                            workspace: null,
                        };
                    })
                ).select(x => {
                    return {
                        action: () => {
                            if (x.job.isRunning) {
                                x.job.stop();
                            } else {
                                x.job.start();
                            }
                        },
                        description: x.job.description,
                        detail: x.workspace ? x.workspace.rootPath : '(global)',
                        label: x.job.name,
                        tag: x.job,
                    };
                }).orderBy(qp => {
                    return ego_helpers.normalizeString(qp.label);
                }).pipe(qp => {
                    if (qp.tag.isRunning) {
                        qp.label = '$(primitive-square)  ' + qp.label;
                    } else {
                        qp.label = '$(triangle-right)  ' + qp.label;
                    }

                    qp.label = qp.label.trim();
                }).toArray();

                if (QUICK_PICKS.length < 1) {
                    vscode.window.showWarningMessage(
                        `No jobs found!`
                    );

                    return;
                }

                const SELECT_ITEM = await vscode.window.showQuickPick(
                    QUICK_PICKS,
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
                const LOG_DIR = ego_helpers.getExtensionDirInHome();

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
                        detail: `Last Change: ${moment(lf.stats.mtime).format('YYYY-MM-DD HH:mm:ss')}`,
                        label: '$(book)  ' + lf.date
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

        // openApp
        vscode.commands.registerCommand('ego.power-tools.openApp', async (appName?: string) => {
            try {
                appName = ego_helpers.normalizeString(appName);
                if ('' === appName) {
                    return await require('./apps')
                        .openApp(context, output);
                } else {
                    return await require('./apps')
                        .openAppByName(context, output, appName);
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
                        label: 'New Script ...',
                        description: 'Opens a new editor for running a script.',
                    },

                    {
                        action: async () => {
                            const FILE = await vscode.window.showOpenDialog({
                                openLabel: 'Open Script ...',
                                canSelectFiles: true,
                                canSelectFolders: false,
                                canSelectMany: false,
                                filters: {
                                    'JavaScript files (*.js)': ['js'],
                                    'All files (*.*)': ['*']
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
                        label: 'Open Script ...',
                        description: 'Opens an existing script file in a new editor.',
                    }
                ];

                const ACTIVE_EDITOR = vscode.window.activeTextEditor;
                if (ACTIVE_EDITOR && ACTIVE_EDITOR.document) {
                    if (SUPPORTED_LANGUAGES.indexOf(ego_helpers.normalizeString(ACTIVE_EDITOR.document.languageId)) > -1) {
                        QUICK_PICKS.unshift({
                            action: async () => {
                                const WEB_VIEW = new ego_scripts.ScriptConsoleWebView(
                                    context, ACTIVE_EDITOR, true
                                );

                                await WEB_VIEW.open();
                            },
                            label: 'Run Script ...',
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

        // send to
        vscode.commands.registerCommand('ego.power-tools.sendTo', async () => {
            try {
                await SEND_TO();
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),

        // TCP proxies
        vscode.commands.registerCommand('ego.power-tools.tcpProxies', async () => {
            try {
                await SHOW_TCP_PROXY_ACTIONS();
            } catch (e) {
                ego_helpers.showErrorMessage(e);
            }
        }),

        // tools
        vscode.commands.registerCommand('ego.power-tools.tools', async () => {
            try {
                const QUICK_PICKS: ego_contracts.ActionQuickPickItem[] = [
                    {
                        action: () => {
                            return OPEN_CODE_EXECUTION();
                        },
                        label: '$(zap)  Code Execution ...',
                        description: 'Executes one line JavaScript code.',
                    },
                    {
                        action: () => {
                            return SEND_TO();
                        },
                        label: '$(rocket)  Send To ...',
                        description: 'Sends the current file in the active editor to a destination.',
                    },
                    {
                        action: () => {
                            return SHOW_TCP_PROXY_ACTIONS();
                        },
                        label: '$(link)  TCP Proxies ...',
                        description: 'Starts or stops one or more TCP proxies.',
                    }
                ];

                const ACTIVE_EDITOR = vscode.window.activeTextEditor;
                if (ACTIVE_EDITOR) {
                    const DOC = ACTIVE_EDITOR.document;
                    if (DOC) {
                        const LANG = ego_helpers.normalizeString(DOC.languageId);
                        if (SUPPORTED_TYPESCRIPT_SRC_LANGUAGES.indexOf(LANG) > -1) {
                            QUICK_PICKS.splice(1, 0, {
                                action: () => {
                                    return GENERATE_TYPESCRIPT(DOC);
                                },
                                label: '$(code)  Generate TypeScript Code ...',
                                description: 'Generates TypeScript code from the value of the current text editor.',
                            });
                        }
                    }
                }

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
    );
}
